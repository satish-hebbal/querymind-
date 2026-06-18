import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AiProvider, ConversationTurn, ResultRow } from "@/types";

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

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";
const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_MODEL = "gpt-4o";
const CLAUDE_MODEL = "claude-3-5-haiku-20241022";

function buildSqlPrompt(schema: string, question: string, history?: ConversationTurn[]): string {
  const historyBlock =
    history && history.length > 0
      ? `\nPrevious questions in this conversation:\n${history
          .map((t) => `Q: ${t.question}\nA: ${t.summary ?? "(no summary)"}`)
          .join("\n")}\n`
      : "";

  return `You are a PostgreSQL expert assistant.
Given this database schema:
${schema}
${historyBlock}
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

  // Strip control characters that are invalid in JSON (keep \t \n \r which are valid SQL whitespace)
  // eslint-disable-next-line no-control-regex
  sql = sql.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return sql.trim();
}

/** Strip control characters that break JSON serialization from any AI-generated string. */
export function sanitizeText(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
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

/** Resolves the API key to use, falling back to the server's shared key for free-tier providers. */
function resolveApiKey(provider: AiProvider, apiKey?: string | null): string {
  if (apiKey) return apiKey;

  if (provider === "nvidia" && process.env.NVIDIA_API_KEY) {
    return process.env.NVIDIA_API_KEY;
  }

  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  // Self-hosted/open-source endpoints often don't require auth at all.
  if (provider === "custom") {
    return "not-needed";
  }

  throw new Error(`No API key configured for ${provider}. Add one in the project's AI Model settings.`);
}

async function callNvidia(prompt: string, apiKey: string, maxTokens?: number): Promise<string> {
  const client = new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });

  const completion = await client.chat.completions.create({
    model: NVIDIA_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: maxTokens ?? 16384,
  });

  return completion.choices[0]?.message?.content ?? "";
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

/**
 * Calls a custom OpenAI-compatible endpoint — covers DeepSeek, Qwen, Mistral,
 * OpenRouter, and self-hosted servers (Ollama, vLLM, LM Studio, etc.).
 */
async function callCustom(
  prompt: string,
  apiKey: string,
  baseUrl: string | null | undefined,
  model: string | null | undefined,
  maxTokens?: number
): Promise<string> {
  if (!baseUrl) {
    throw new Error("No base URL configured for the custom provider. Add one in the project's AI Model settings.");
  }

  if (!model) {
    throw new Error("No model name configured for the custom provider. Add one in the project's AI Model settings.");
  }

  const client = new OpenAI({ apiKey, baseURL: baseUrl });

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  });

  return completion.choices[0]?.message?.content ?? "";
}

async function callModel(
  provider: AiProvider,
  prompt: string,
  apiKey: string,
  maxTokens?: number,
  baseUrl?: string | null,
  model?: string | null
): Promise<string> {
  switch (provider) {
    case "nvidia":
      return callNvidia(prompt, apiKey, maxTokens);
    case "gemini":
      return callGemini(prompt, apiKey, maxTokens);
    case "openai":
      return callOpenAI(prompt, apiKey, maxTokens);
    case "claude":
      return callClaude(prompt, apiKey, maxTokens);
    case "custom":
      return callCustom(prompt, apiKey, baseUrl, model, maxTokens);
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
  apiKey?: string | null,
  baseUrl?: string | null,
  model?: string | null,
  conversationHistory?: ConversationTurn[]
): Promise<string> {
  const key = resolveApiKey(provider, apiKey);
  const prompt = buildSqlPrompt(schema, question, conversationHistory);
  const text = await callModel(provider, prompt, key, undefined, baseUrl, model);

  return cleanSqlResponse(text);
}

function buildSuggestionsPrompt(question: string, schema: string): string {
  return `You are a database assistant.
Given this PostgreSQL schema:
${schema}

The user asked: "${question}"
This cannot be answered from the schema above.

Suggest exactly 3 short, specific questions that CAN be answered from this schema.
Return ONLY a valid JSON array of 3 strings, nothing else.
Example: ["How many rows are in orders?", "What is the total revenue?", "List all customers"]`;
}

/**
 * Generates 3 alternative questions the user can ask, based on their original
 * unanswerable question and the schema. Returns [] if generation fails.
 */
export async function generateSuggestions(
  question: string,
  schema: string,
  provider: AiProvider,
  apiKey?: string | null,
  baseUrl?: string | null,
  model?: string | null
): Promise<string[]> {
  try {
    const key = resolveApiKey(provider, apiKey);
    const prompt = buildSuggestionsPrompt(question, schema);
    const text = await callModel(provider, prompt, key, 200, baseUrl, model);
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as unknown;
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return (parsed as string[]).slice(0, 3);
    }
    return [];
  } catch {
    return [];
  }
}

/** Generates a 4-6 word chat title from the user's first question. */
export async function generateSessionTitle(
  question: string,
  provider: AiProvider,
  apiKey?: string | null,
  baseUrl?: string | null,
  model?: string | null
): Promise<string> {
  try {
    const key = resolveApiKey(provider, apiKey);
    const prompt = `Summarize this database question as a chat title in 4-6 words. Return ONLY the title text, no punctuation at the end, no quotes.\n\nQuestion: ${question}`;
    const text = await callModel(provider, prompt, key, 30, baseUrl, model);
    const title = text.trim().replace(/^["']|["']$/g, "").trim();
    return title || question.slice(0, 50);
  } catch {
    return question.slice(0, 50);
  }
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
  apiKey?: string | null,
  baseUrl?: string | null,
  model?: string | null
): Promise<string> {
  const key = resolveApiKey(provider, apiKey);
  const prompt = buildSummaryPrompt(question, columns, rows, rowCount);
  const text = await callModel(provider, prompt, key, 100, baseUrl, model);

  return text.trim();
}
