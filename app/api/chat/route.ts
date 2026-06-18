import {
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";
import { z } from "zod";
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { decrypt } from "@/lib/encrypt";
import { resolveModel, resolveApiKeyForProvider } from "@/lib/ai-providers";
import { queryProjectDb } from "@/lib/project-db";
import { getProjectSchema } from "@/lib/schema";
import { validateConnectionString } from "@/lib/db-errors";
import { cleanSqlResponse, validateSql, generateSQL, generateSummary, CANNOT_ANSWER } from "@/lib/ai";
import { buildSpecInstructions, parseSpecResponse, resolveForcedViz, type VizSpec } from "@/lib/viz-spec";
import { createClient } from "@/lib/supabase/server";

/**
 * Robustly pulls a SELECT statement out of a model response. Kimi K2 sometimes
 * wraps SQL in prose ("Here is the query:") or fences anywhere in the text, which
 * the start-anchored cleanSqlResponse misses. We prefer a fenced block, then the
 * first SELECT onward, then fall back to the cleaned text.
 */
function extractSelect(raw: string): string {
  const fenced = raw.match(/```(?:sql)?\s*\n?([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const selectMatch = candidate.match(/\bselect\b[\s\S]*/i);
  const sql = cleanSqlResponse(selectMatch ? selectMatch[0] : candidate);
  return sql;
}

/**
 * Retries an async function with exponential backoff on rate limit (429) errors.
 * Returns null if all retries are exhausted.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 3000
): Promise<T | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes("429") || msg.includes("rate") || msg.includes("Rate limit");
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt); // 3s, 6s
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  return null;
}

/** Races a promise against a timeout. Returns null if timeout wins. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

import type { AiProvider, ResultRow } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function extractQuestion(rawMessages: unknown[]): string {
  const last = rawMessages[rawMessages.length - 1] as {
    parts?: Array<{ type: string; text?: string }>;
  } | undefined;
  return last?.parts?.find((p) => p.type === "text")?.text ?? "";
}

type SqlData = {
  sql: string;
  columns: string[];
  rows: ResultRow[];
  rowCount: number;
};

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_VIZ_MODEL = "meta/llama-3.3-70b-instruct";

/**
 * Single fast Kimi K2 call that returns BOTH a one-sentence summary and a
 * compact JSON visualization spec. A spec is only a few hundred tokens, so this
 * returns in a couple of seconds — unlike asking the model to write a full React
 * component, which took 50s+ and timed out. The client renders the spec with
 * prebuilt, themed, interactive components.
 */
async function generateVizSpec(
  question: string,
  data: SqlData,
  apiKey: string,
  forcedViz?: string | null
): Promise<{ summary: string | null; spec: Partial<VizSpec> | null }> {
  const client = new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });

  const dataPreview = JSON.stringify(
    data.rows.slice(0, 20).map((r) => {
      const row: Record<string, unknown> = {};
      for (const c of data.columns) row[c] = r[c];
      return row;
    }),
    null,
    0
  );

  const systemPrompt = buildSpecInstructions(question, forcedViz);

  const userPrompt = `User's question: "${question}"

Columns: ${data.columns.join(", ")}
Row count: ${data.rowCount}
Sample data (up to 20 rows): ${dataPreview}`;

  const response = await withTimeout(
    client.chat.completions.create({
      model: NVIDIA_VIZ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 700,
      temperature: 0.3,
    }),
    25000
  );

  if (!response) {
    console.error("[viz] generateVizSpec: timed out");
    return { summary: null, spec: null };
  }

  const raw = response.choices?.[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    console.error("[viz] generateVizSpec: empty model response");
    return { summary: null, spec: null };
  }

  const parsed = parseSpecResponse(raw);
  const { summary, ...spec } = parsed;
  if (!spec.layout) {
    console.error("[viz] generateVizSpec: no usable layout in response. First 200 chars:", raw.slice(0, 200));
  }
  return { summary: summary ?? null, spec: Object.keys(spec).length ? spec : null };
}

type PersistResult = {
  columns: string[];
  rows: ResultRow[];
  rowCount: number;
  summary?: string;
  /** Visualization spec, so history restores as the same generative UI. */
  spec?: Partial<VizSpec> | null;
};

/**
 * Persists one conversation turn to the `chats` table. Best-effort: a failure
 * (e.g. RLS, missing session) never breaks the response stream. Persisting
 * every answerable turn — including schema-only answers with no SQL — is what
 * makes chat history reliably reappear in the sidebar and on restore.
 */
async function persistTurn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: {
    projectId: string;
    userId: string;
    sessionId?: string | null;
    question: string;
    sql: string | null;
    result: PersistResult;
  }
): Promise<void> {
  if (!args.sessionId) {
    console.error("[persist] skipped: no sessionId");
    return;
  }
  try {
    // Supabase returns { error } rather than throwing on insert failures, so we
    // must inspect it — otherwise RLS/missing-column errors vanish silently and
    // history never gets saved.
    const { error } = await supabase.from("chats").insert({
      project_id: args.projectId,
      user_id: args.userId,
      session_id: args.sessionId,
      question: args.question,
      sql_generated: args.sql,
      result_json: {
        sql: args.sql ?? "",
        columns: args.result.columns,
        rows: args.result.rows,
        rowCount: args.result.rowCount,
        summary: args.result.summary,
        spec: args.result.spec ?? null,
      },
    });
    if (error) console.error("[persist] chats insert failed:", error.message ?? error);
  } catch (e) {
    console.error("[persist] chats insert threw:", e instanceof Error ? e.message : e);
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await req.json() as {
    messages: unknown[];
    projectId: string;
    sessionId?: string | null;
    forcedViz?: string | null;
  };

  const { projectId, sessionId, forcedViz } = body;
  const rawMessages = body.messages ?? [];

  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required" }), { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("db_url, ai_provider, ai_api_key, ai_base_url, ai_model")
    .eq("id", projectId)
    .single();

  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
  }

  let dbUrl: string;
  try {
    dbUrl = decrypt(project.db_url as string);
  } catch {
    return new Response(JSON.stringify({ error: "Couldn't decrypt DB connection." }), { status: 500 });
  }

  const formatError = validateConnectionString(dbUrl);
  if (formatError) {
    return new Response(JSON.stringify({ error: formatError }), { status: 422 });
  }

  let aiApiKey: string | null = null;
  if (project.ai_api_key) {
    try { aiApiKey = decrypt(project.ai_api_key as string); } catch { /* ignore */ }
  }

  const aiProvider = project.ai_provider as AiProvider;
  const resolvedKey = resolveApiKeyForProvider(aiProvider, aiApiKey);
  const schema = await getProjectSchema(projectId, dbUrl);
  const question = extractQuestion(rawMessages);

  // ── NVIDIA path ────────────────────────────────────────────────────────────
  // Kimi K2 doesn't do reliable multi-step tool calling, and the free NVIDIA
  // tier is rate-limited, so we keep it to TWO plain completions: one to write
  // the SQL, one to write the summary + creative React visualization together.
  if (aiProvider === "nvidia") {
    const nvidiaKey = resolvedKey ?? process.env.NVIDIA_API_KEY;
    if (!nvidiaKey) {
      return new Response(JSON.stringify({ error: "NVIDIA API key is not configured." }), { status: 500 });
    }

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const writeText = (text: string) => {
          const id = generateId();
          writer.write({ type: "text-start", id });
          writer.write({ type: "text-delta", id, delta: text });
          writer.write({ type: "text-end", id });
        };

        // ── Step 1: Generate SQL (single completion, with rate-limit retry) ──
        let rawSql: string | null = null;
        try {
          rawSql = await retryWithBackoff(
            () => generateSQL(question, schema, "nvidia", nvidiaKey),
            2,
            4000
          );
        } catch (err) {
          console.error("[viz] generateSQL failed:", err instanceof Error ? err.message : err);
        }

        if (!rawSql) {
          writeText("The AI is temporarily rate-limited. Please wait a moment and try again.");
          return;
        }

        const sql = extractSelect(rawSql);

        if (rawSql.trim().toUpperCase().includes(CANNOT_ANSWER) || !sql.trim()) {
          const msg = "I can't answer that from the available schema. Try rephrasing your question.";
          writeText(msg);
          await persistTurn(supabase, {
            projectId, userId: userData.user.id, sessionId, question,
            sql: null, result: { columns: [], rows: [], rowCount: 0, summary: msg, spec: null },
          });
          return;
        }

        const validation = validateSql(sql);
        if (!validation.valid) {
          console.error("[viz] generated SQL rejected:", validation.reason, "|", sql);
          writeText("I couldn't build a safe query for that. Try rephrasing your question.");
          return;
        }

        // ── Step 2: Run the query ──
        let qr;
        try {
          qr = await queryProjectDb<ResultRow>(dbUrl, sql);
        } catch (err) {
          console.error("[viz] query execution failed:", err instanceof Error ? err.message : err);
          writeText("That query couldn't run against your database. Try rephrasing your question.");
          return;
        }

        const sqlData: SqlData = {
          sql,
          columns: qr.columns,
          rows: qr.rows.slice(0, 100),
          rowCount: qr.rowCount,
        };

        // run_sql tool chunk (shows that SQL ran)
        const sqlToolId = generateId();
        writer.write({ type: "tool-input-available", toolCallId: sqlToolId, toolName: "run_sql", input: { sql } });
        writer.write({ type: "tool-output-available", toolCallId: sqlToolId, output: { sql, rowCount: qr.rowCount } });

        // ── Step 3: Single fast call → summary + JSON visualization spec ──
        // On failure, spec is null and the client derives a sensible interactive
        // layout from the data, so a good visualization always appears.
        let summary: string | null = null;
        let spec: Partial<VizSpec> | null = null;
        try {
          const viz = await retryWithBackoff(
            () => generateVizSpec(question, sqlData, nvidiaKey, forcedViz),
            1,
            3000
          );
          if (viz) {
            summary = viz.summary;
            spec = viz.spec;
          }
        } catch (err) {
          console.error("[viz] generateVizSpec threw:", err instanceof Error ? err.message : err);
        }

        // A picker choice always wins — bake it in even if the model ignored it
        // or failed entirely (so the user's selected visualization is honored).
        const forcedLayout = resolveForcedViz(forcedViz);
        if (forcedLayout) spec = { ...(spec ?? {}), layout: forcedLayout };

        // Summary fallback — derive a concise sentence from the data if needed.
        if (!summary) {
          try {
            summary = await generateSummary(question, sqlData.columns, sqlData.rows, sqlData.rowCount, "nvidia", nvidiaKey);
          } catch {
            summary = `Query returned ${sqlData.rowCount} row${sqlData.rowCount !== 1 ? "s" : ""}.`;
          }
        }

        const vizToolId = generateId();
        writer.write({
          type: "tool-input-available",
          toolCallId: vizToolId,
          toolName: "render_visualization",
          input: { spec, summary, question },
        });
        writer.write({
          type: "tool-output-available",
          toolCallId: vizToolId,
          output: { spec, summary, question, ...sqlData },
        });

        if (summary) writeText(summary);

        await persistTurn(supabase, {
          projectId,
          userId: userData.user.id,
          sessionId,
          question,
          sql,
          result: {
            columns: qr.columns,
            rows: qr.rows,
            rowCount: qr.rowCount,
            summary: summary ?? undefined,
            spec,
          },
        });
      },
      onError: () => "Something went wrong while running your query. Please try again.",
    });

    return createUIMessageStreamResponse({ stream });
  }

  // ── Native providers (OpenAI / Gemini / Claude / custom) ──────────────────
  const model = resolveModel(aiProvider, resolvedKey, project.ai_base_url as string | null, project.ai_model as string | null);
  const trimmedMessages = rawMessages.slice(-13);
  const modelMessages = await convertToModelMessages(trimmedMessages as Parameters<typeof convertToModelMessages>[0]);

  let capturedSqlData: SqlData | null = null;
  let capturedSpec: Partial<VizSpec> | null = null;

  const result = streamText({
    model,
    system: `You are a PostgreSQL expert and data visualization engineer.

Database schema:
${schema}

## Workflow
1. Call \`run_sql\` with a valid read-only SELECT query.
2. After seeing the data, call \`render_visualization\` with a compact \`spec\` and a one-sentence \`summary\`.

${buildSpecInstructions(question, forcedViz)}`,

    messages: modelMessages,

    tools: {
      run_sql: tool({
        description: "Execute a read-only PostgreSQL SELECT query. Always call this first.",
        inputSchema: z.object({
          sql: z.string().describe("Valid PostgreSQL SELECT statement. No semicolons at the end."),
        }),
        execute: async ({ sql }) => {
          const cleaned = cleanSqlResponse(sql);
          const validation = validateSql(cleaned);
          if (!validation.valid) {
            return { error: `Query rejected: ${validation.reason}` };
          }
          try {
            const qr = await queryProjectDb<ResultRow>(dbUrl, cleaned);
            capturedSqlData = { sql: cleaned, columns: qr.columns, rows: qr.rows, rowCount: qr.rowCount };
            return { sql: cleaned, columns: qr.columns, rows: qr.rows.slice(0, 100), rowCount: qr.rowCount };
          } catch (err) {
            return { error: `Database error: ${err instanceof Error ? err.message : String(err)}` };
          }
        },
      }),

      render_visualization: tool({
        description: "Render the interactive visualization for the query data. Call after run_sql. Honor any chart type the user explicitly asked for; otherwise pick the richest insightful layout.",
        inputSchema: z.object({
          layout: z.enum(["kpi", "leaderboard", "comparison", "cards", "breakdown", "stacked", "bullet", "heatmap", "line", "area", "bar", "pie", "table"]),
          title: z.string().optional(),
          label: z.string().optional().describe("Column holding item names/labels. Never an id/uuid."),
          metric: z.string().optional().describe("Primary numeric column to emphasize."),
          secondary: z.string().optional().describe("Optional second numeric column."),
          sort: z.enum(["asc", "desc", "none"]).optional(),
          highlightTop: z.number().optional(),
          summary: z.string().describe("One sentence directly answering the question, with specific numbers."),
        }),
        execute: async ({ summary, ...spec }) => {
          const forcedLayout = resolveForcedViz(forcedViz);
          capturedSpec = forcedLayout ? { ...spec, layout: forcedLayout } : spec;
          return { spec: capturedSpec, summary, question, ...(capturedSqlData ?? {}) };
        },
      }),
    },

    stopWhen: stepCountIs(4),

    onFinish: async ({ text }) => {
      await persistTurn(supabase, {
        projectId,
        userId: userData.user.id,
        sessionId,
        question,
        sql: capturedSqlData?.sql ?? null,
        result: {
          columns: capturedSqlData?.columns ?? [],
          rows: capturedSqlData?.rows ?? [],
          rowCount: capturedSqlData?.rowCount ?? 0,
          summary: text,
          spec: capturedSpec,
        },
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
