import type { AiProvider } from "@/types";

interface ErrorWithCode extends Error {
  code?: string;
  errors?: unknown[];
}

const ERROR_MESSAGES: Record<string, string> = {
  ENOTFOUND:
    "Couldn't find that database host. Double-check the hostname in your connection string for typos.",
  ECONNREFUSED:
    "The database refused the connection. Check that the host and port are correct and that the database is running and reachable from here.",
  ETIMEDOUT:
    "Connection to the database timed out. Check the host and port in your connection string, and make sure nothing (a firewall, VPN, or IP allow-list) is blocking the connection.",
  ENETUNREACH: "The database host is unreachable from here. Check the host in your connection string.",
  ECONNRESET: "The connection to the database was reset by the server. Try again, or double-check your connection string.",
  "08006": "The connection to the database was closed unexpectedly. Check your connection string and that the database is reachable.",
  "28P01": "That username or password was rejected. Check the credentials in your connection string.",
  "28000": "That username or password was rejected. Check the credentials in your connection string.",
  "3D000": "That database name doesn't exist on the server. Check the database name in your connection string.",
  "42501": "The database user doesn't have permission to run that query.",
};

/**
 * Checks whether a string looks like a usable PostgreSQL connection string,
 * and returns a plain-language explanation if not (or null if it looks fine).
 */
export function validateConnectionString(connectionString: string): string | null {
  const trimmed = connectionString.trim();

  if (!trimmed) {
    return "Enter a database connection string.";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return 'That\'s a website/API URL, not a database connection string. In Supabase, go to Project Settings → Database and copy the "Connection string" (it starts with postgresql://), not the Project URL.';
  }

  if (!/^postgres(ql)?:\/\//i.test(trimmed)) {
    return "That doesn't look like a PostgreSQL connection string. It should start with postgresql:// or postgres://, e.g. postgresql://user:password@host:5432/database.";
  }

  if (/\[YOUR[-_]?PASSWORD\]/i.test(trimmed)) {
    return "Replace the [YOUR-PASSWORD] placeholder in your connection string with your actual database password.";
  }

  return null;
}

const SUPABASE_POOLER_HINT =
  "Looks like a Supabase direct connection (db.xxx.supabase.co) — these use IPv6 and can't be reached from most cloud servers. " +
  "Fix: in your Supabase project click Connect (top right) → open the Session pooler tab (port 5432, NOT Transaction pooler) → copy that URL → replace [YOUR-PASSWORD] with your database password → " +
  "paste it in Config → Database and save.";

function isSupabaseDirectUrl(connectionString: string): boolean {
  return /\bdb\.[a-z0-9]+\.supabase\.co\b/i.test(connectionString);
}

/** Turns a connection/query error into a clear, plain-language message.
 *  Pass `connectionString` for smarter, provider-specific hints. */
export function describeDbError(error: unknown, connectionString?: string): string {
  if (!(error instanceof Error)) {
    return "Something unexpected went wrong while talking to your database.";
  }

  const candidates: ErrorWithCode[] = [error as ErrorWithCode];
  if (Array.isArray((error as ErrorWithCode).errors)) {
    candidates.push(...((error as ErrorWithCode).errors as ErrorWithCode[]));
  }

  for (const candidate of candidates) {
    if (candidate.code && ERROR_MESSAGES[candidate.code]) {
      if ((candidate.code === "ENOTFOUND" || candidate.code === "ETIMEDOUT" || candidate.code === "ENETUNREACH") &&
          connectionString && isSupabaseDirectUrl(connectionString)) {
        return SUPABASE_POOLER_HINT;
      }
      return ERROR_MESSAGES[candidate.code];
    }
  }

  if (candidates.some((candidate) => candidate.message.toLowerCase().includes("timeout"))) {
    if (connectionString && isSupabaseDirectUrl(connectionString)) return SUPABASE_POOLER_HINT;
    return ERROR_MESSAGES.ETIMEDOUT;
  }

  const withMessage = candidates.find((candidate) => candidate.message);
  return withMessage?.message || "Something unexpected went wrong while talking to your database.";
}

const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
  claude: "Claude",
  custom: "Custom",
};

const AI_BILLING_URLS: Partial<Record<AiProvider, string>> = {
  gemini: "https://ai.google.dev/gemini-api/docs/rate-limits",
  openai: "https://platform.openai.com/account/billing",
  claude: "https://console.anthropic.com/settings/billing",
};

/** Turns a raw AI-provider error (Gemini/OpenAI/Claude/custom) into a clear, plain-language message. */
export function describeAiError(error: unknown, provider: AiProvider): string {
  if (!(error instanceof Error)) {
    return "Something unexpected went wrong while generating the query.";
  }

  const message = error.message;
  const label = AI_PROVIDER_LABELS[provider];

  if (message.startsWith("No API key configured for") || message.includes("configured for the custom provider")) {
    return message;
  }

  if (/429|too many requests|rate.?limit|quota/i.test(message)) {
    const billingUrl = AI_BILLING_URLS[provider];

    if (provider === "gemini" && message.includes("free_tier")) {
      return `The shared free ${label} key has hit its daily limit for the free tier. Wait a minute and try again, or add your own ${label} API key in Config → AI Model for higher limits. (${billingUrl})`;
    }

    return billingUrl
      ? `${label} is rate-limiting requests right now. Wait a moment and try again, or check your usage/billing at ${billingUrl}.`
      : "Your custom endpoint is rate-limiting requests right now. Wait a moment and try again.";
  }

  if (/401|invalid.*api.?key|api.?key.*invalid|unauthorized|authentication/i.test(message)) {
    return provider === "custom"
      ? "The custom endpoint rejected your API key. Check the key, base URL, and model name in Config → AI Model."
      : `Your ${label} API key was rejected. Check it in Config → AI Model, or remove it to use the shared free key (Gemini only).`;
  }

  if (/timeout|timed out|network|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    return provider === "custom"
      ? "Couldn't reach the custom endpoint. Check the base URL in Config → AI Model and make sure the server is running and reachable."
      : `Couldn't reach ${label} right now. Check your connection and try again.`;
  }

  const firstLine = message.split("\n")[0];
  return firstLine.length > 220 ? `${firstLine.slice(0, 220)}…` : firstLine;
}
