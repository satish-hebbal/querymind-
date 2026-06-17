import OpenAI from "openai";
import { Agent, run, tool, setDefaultOpenAIClient, setOpenAIAPI } from "@openai/agents";
import { z } from "zod";
import { cleanSqlResponse, validateSql, CANNOT_ANSWER } from "./ai";
import { queryProjectDb } from "./project-db";
import type { ResultRow } from "@/types";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "moonshotai/kimi-k2.6";

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
  apiKey: string
): Promise<AgentQueryResult> {
  const client = new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });
  setDefaultOpenAIClient(client);
  setOpenAIAPI("chat_completions");

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

  const agent = new Agent({
    name: "sql_analyst",
    model: NVIDIA_MODEL,
    instructions: `You are a PostgreSQL expert data analyst.

Database schema:
${schema}

Rules:
1. Use the run_sql tool to query the database and answer the user's question.
2. Only SELECT statements are allowed — no writes of any kind.
3. After getting results, respond with exactly one concise plain-English sentence that directly answers the question. No markdown, no preamble.
4. If the question cannot be answered from the schema above, respond with exactly: ${CANNOT_ANSWER}`,
    tools: [runSqlTool],
  });

  const result = await run(agent, question, { maxTurns: 6 });
  const summary = result.finalOutput?.trim() ?? "";

  if (!capturedSql || summary === CANNOT_ANSWER) {
    return { sql: "", columns: [], rows: [], rowCount: 0, summary, cannotAnswer: true };
  }

  return {
    sql: capturedSql,
    columns: capturedColumns,
    rows: capturedRows,
    rowCount: capturedRowCount,
    summary,
    cannotAnswer: false,
  };
}
