import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AiProvider, ResultRow } from "@/types";

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

const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_MODEL = "gpt-4o";
const CLAUDE_MODEL = "claude-3-5-haiku-20241022";

function buildSqlPrompt(schema: string, question: string): string {
  return `You are a PostgreSQL expert assistant.
Given this database schema:
${schema}

Convert the question to a valid PostgreSQL SELECT query only.
Rules:
1. Return ONLY raw SQL. No explanation, no markdown, no backticks.
2. Only SELECT. Never INSERT/UPDATE/DELETE/DROP/ALTER.
3. Limit to 100 rows unless asked for more.
4. If unanswerable from schema return exactly: CANNOT_ANSWER

Question: ${question}`;
}

function buildSummaryPrompt(question: string, columns: string[], rows: ResultRow[], rowCount: number): string {
  const sample = rows.slice(0, 10);

  return `You are a data analyst.
Question: ${question}
Result columns: ${columns.join(", ")}
Total rows: ${rowCount}
Result data (JSON, up to 10 rows shown): ${JSON.stringify(sample)}

Write exactly one short, plain-language sentence that directly answers the question using this data.
No markdown, no preamble, no column names unless natural. If there is no data, say so plainly.`;
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

/** Resolves the API key to use, falling back to the server's Gemini key for the free tier. */
function resolveApiKey(provider: AiProvider, apiKey?: string | null): string {
  if (apiKey) return apiKey;

  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  throw new Error(`No API key configured for ${provider}. Add one in the project's AI Model settings.`);
}

async function callGemini(prompt: string, apiKey: string, maxOutputTokens?: number): Promise<string> {
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    ...(maxOutputTokens ? { generationConfig: { maxOutputTokens, temperature: 0.2 } } : {}),
  });

  return result.response.text();
}

async function callOpenAI(prompt: string, apiKey: string, maxTokens?: number): Promise<string> {
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  });

  return completion.choices[0]?.message?.content ?? "";
}

async function callClaude(prompt: string, apiKey: string, maxTokens = 1024): Promise<string> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  return block?.type === "text" ? block.text : "";
}

async function callModel(provider: AiProvider, prompt: string, apiKey: string, maxTokens?: number): Promise<string> {
  switch (provider) {
    case "gemini":
      return callGemini(prompt, apiKey, maxTokens);
    case "openai":
      return callOpenAI(prompt, apiKey, maxTokens);
    case "claude":
      return callClaude(prompt, apiKey, maxTokens);
  }
}

/**
 * Sends the schema + natural language question to the configured AI
 * provider and returns the cleaned SQL string (or the literal CANNOT_ANSWER
 * sentinel).
 */
export async function generateSQL(
  question: string,
  schema: string,
  provider: AiProvider,
  apiKey?: string | null
): Promise<string> {
  const key = resolveApiKey(provider, apiKey);
  const prompt = buildSqlPrompt(schema, question);
  const text = await callModel(provider, prompt, key);

  return cleanSqlResponse(text);
}

/**
 * Generates a single plain-language sentence answering the question from
 * the query results, so the user gets a direct answer alongside the table/chart.
 */
export async function generateSummary(
  question: string,
  columns: string[],
  rows: ResultRow[],
  rowCount: number,
  provider: AiProvider,
  apiKey?: string | null
): Promise<string> {
  const key = resolveApiKey(provider, apiKey);
  const prompt = buildSummaryPrompt(question, columns, rows, rowCount);
  const text = await callModel(provider, prompt, key, 100);

  return text.trim();
}
