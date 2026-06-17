import type { AiProvider, DbType } from "@/types";

export const DB_TYPE_LABELS: Record<DbType, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
};

export const DB_TYPE_ICONS: Record<DbType, string> = {
  postgresql: "/db-icons/postgresql-icon.svg",
  mysql: "/db-icons/mysql-icon.svg",
  sqlite: "/db-icons/sqlite-icon.svg",
};

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  nvidia: "Kimi K2",
  gemini: "Gemini",
  openai: "GPT-4o",
  claude: "Claude",
  custom: "Custom",
};

export const AI_PROVIDER_ICONS: Record<AiProvider, string> = {
  nvidia: "/model-icons/kimi-ai-icon.svg",
  gemini: "/model-icons/gemini-icon.svg",
  openai: "/model-icons/openai-icon.svg",
  claude: "/model-icons/claude-icon.svg",
  custom: "/model-icons/custom-icon.svg",
};

/** Example OpenAI-compatible providers shown alongside the "Custom" option. */
export const CUSTOM_PROVIDER_EXAMPLES: { label: string; icon: string }[] = [
  { label: "DeepSeek", icon: "/model-icons/deepseek-logo-icon.svg" },
  { label: "Qwen", icon: "/model-icons/qwen-ai-icon.svg" },
  { label: "Mistral", icon: "/model-icons/mistral-ai-icon.svg" },
];
