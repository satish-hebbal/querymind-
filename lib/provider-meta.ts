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
  gemini: "Gemini",
  openai: "GPT-4o",
  claude: "Claude",
};

export const AI_PROVIDER_ICONS: Record<AiProvider, string> = {
  gemini: "/model-icons/gemini-icon.svg",
  openai: "/model-icons/openai-icon.svg",
  claude: "/model-icons/claude-icon.svg",
};
