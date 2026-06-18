import OpenAI from "openai";
import { Agent, run, tool, setDefaultOpenAIClient, setOpenAIAPI, setTracingDisabled } from "@openai/agents";
import { z } from "zod";
import { cleanSqlResponse, validateSql, CANNOT_ANSWER, generateSummary, sanitizeText } from "./ai";
import { queryProjectDb } from "./project-db";
import type { ConversationTurn, ResultRow } from "@/types";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

export interface AgentQueryResult {
  sql: string;
  columns: string[];
  rows: ResultRow[];
  rowCount: number;
  summary: string;
  cannotAnswer: boolean;
}

export async function runSqlAgent(
  question: string,
  schema: string,
  dbUrl: string,
  apiKey: string,
  conversationHistory?: ConversationTurn[]
): Promise<AgentQueryResult> {
  const client = new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });
  setDefaultOpenAIClient(client);
  setOpenAIAPI("chat_completions");
  setTracingDisabled(true);

  let capturedSql = "";
  let capturedColumns: string[] = [];
  let capturedRows: ResultRow[] = [];
  let capturedRowCount = 0;

  const runSqlTool = tool({
    name: "run_sql",
    description: "Execute a read-only PostgreSQL SELECT query against the database and return results as JSON.",
    parameters: z.object({
      sql: z.string().describe(
        "A valid PostgreSQL SELECT statement. No semicolons. No INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE."
      ),
    }),
    execute: async ({ sql }) => {
      const cleaned = cleanSqlResponse(sql);
      const validation = validateSql(cleaned);

      if (!validation.valid) {
        return `Query rejected: ${validation.reason}. Rewrite the query and try again.`;
      }

      try {
        const result = await queryProjectDb<ResultRow>(dbUrl, cleaned);
        capturedSql = cleaned;
        capturedColumns = result.columns;
        capturedRows = result.rows;
        capturedRowCount = result.rowCount;

        return JSON.stringify({
          columns: result.columns,
          rowCount: result.rowCount,
          rows: result.rows.slice(0, 50),
        });
      } catch (err) {
        return `Database error: ${err instanceof Error ? err.message : String(err)}. Fix the query and try again.`;
      }
    },
  });

  const historyBlock =
    conversationHistory && conversationHistory.length > 0
      ? `\nPrevious questions in this conversation:\n${conversationHistory
          .map((t) => `Q: ${t.question}\nA: ${t.summary ?? "(no summary)"}`)
          .join("\n")}\n`
      : "";

  const agent = new Agent({
    name: "sql_analyst",
    model: NVIDIA_MODEL,
    instructions: `You are a PostgreSQL expert data analyst.

Database schema:
${schema}
${historyBlock}
Rules:
1. Use the run_sql tool to query the database and answer the user's question.
2. Only SELECT statements are allowed — no writes of any kind.
3. After getting results, respond with exactly one concise plain-English sentence that directly answers the question. No markdown, no preamble.
4. If the question cannot be answered from the schema above, respond with exactly: ${CANNOT_ANSWER}`,
    tools: [runSqlTool],
  });

  // Run with a 40s timeout — if Kimi K2 hangs, we don't block forever
  const result = await Promise.race([
    run(agent, question, { maxTurns: 6 }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Agent timeout")), 40000)),
  ]);
  let summary = result.finalOutput?.trim() ?? "";

  // Kimi K2 often ignores "one concise sentence" and dumps a long, markdown-y
  // wall of text, or leaks tool-call special tokens. In any of those cases,
  // regenerate a clean single-sentence summary from the captured data.
  const isGarbled =
    !summary ||
    summary.includes("<|") ||
    summary.includes("|tool_call") ||
    summary.includes("|>") ||
    summary.includes("```") ||
    summary.length > 360 ||
    (summary.match(/\n/g)?.length ?? 0) >= 2 ||
    /(^|\n)\s*[-*•]\s/.test(summary);
  if (isGarbled && capturedSql) {
    try {
      summary = await generateSummary(question, capturedColumns, capturedRows, capturedRowCount, "nvidia", apiKey);
    } catch {
      summary = `Query returned ${capturedRowCount} row${capturedRowCount !== 1 ? "s" : ""}.`;
    }
  }

  if (!capturedSql || summary === CANNOT_ANSWER) {
    return { sql: "", columns: [], rows: [], rowCount: 0, summary, cannotAnswer: true };
  }

  return {
    sql: sanitizeText(capturedSql),
    columns: capturedColumns,
    rows: capturedRows,
    rowCount: capturedRowCount,
    summary: sanitizeText(summary),
    cannotAnswer: false,
  };
}
