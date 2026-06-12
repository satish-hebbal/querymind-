import { GoogleGenerativeAI } from "@google/generative-ai";

export const CANNOT_ANSWER = "CANNOT_ANSWER";

// Statement-level keywords that should never appear in a generated query.
// Word-boundary matching avoids false positives like "created_at" matching "create".
const FORBIDDEN_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "truncate",
  "create",
  "grant",
  "revoke",
  "execute",
  "call",
  "merge",
  "copy",
  "vacuum",
  "comment",
  "into",
  "pg_sleep",
];

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  return new GoogleGenerativeAI(apiKey);
}

function buildPrompt(schema: string, question: string): string {
  return `You are a PostgreSQL expert for an event management company.
Given this schema:
${schema}

Convert the question to a valid PostgreSQL SELECT query only.
Rules:
1. Return ONLY raw SQL. No explanation, no markdown, no backticks.
2. Only SELECT. Never INSERT/UPDATE/DELETE/DROP/ALTER.
3. Limit to 100 rows unless asked for more.
4. If unanswerable from schema return exactly: CANNOT_ANSWER
5. When filtering events by lifecycle state (upcoming, completed, cancelled), use the events.status column rather than comparing the date column to the current date.

Question: ${question}`;
}

/** Strips markdown code fences and trailing semicolons from a model response. */
export function cleanSqlResponse(text: string): string {
  let sql = text.trim();

  sql = sql.replace(/^```(?:sql)?/i, "").replace(/```$/i, "");
  sql = sql.trim();
  sql = sql.replace(/;+\s*$/g, "");

  return sql.trim();
}

export interface SqlValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates that a generated SQL string is a single, read-only SELECT
 * statement with no statement-altering keywords.
 */
export function validateSql(sql: string): SqlValidationResult {
  const trimmed = sql.trim();

  if (!trimmed) {
    return { valid: false, reason: "Generated SQL is empty." };
  }

  const lower = trimmed.toLowerCase();

  if (!lower.startsWith("select")) {
    return { valid: false, reason: "Query must start with SELECT." };
  }

  if (trimmed.includes(";")) {
    return { valid: false, reason: "Multiple statements are not allowed." };
  }

  for (const keyword of FORBIDDEN_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, "i");
    if (pattern.test(lower)) {
      return { valid: false, reason: `Disallowed keyword detected: ${keyword.toUpperCase()}` };
    }
  }

  return { valid: true };
}

/**
 * Sends the schema + natural language question to Gemini and returns the
 * cleaned SQL string (or the literal CANNOT_ANSWER sentinel).
 */
export async function generateSql(schema: string, question: string): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = buildPrompt(schema, question);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return cleanSqlResponse(text);
}
