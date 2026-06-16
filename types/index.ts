export type CellValue = string | number | boolean | null;

export type ResultRow = Record<string, CellValue>;

export interface QueryResult {
  sql: string;
  columns: string[];
  rows: ResultRow[];
  rowCount: number;
  summary?: string;
}

export interface QueryApiResponse {
  sql: string;
  columns: string[];
  rows: ResultRow[];
  rowCount: number;
  summary?: string;
  chatId?: string;
  error?: undefined;
}

export type ErrorKind = "soft" | "hard";

export interface QueryApiError {
  error: string;
  sql?: string;
  errorKind?: ErrorKind;
  suggestions?: string[];
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  result?: QueryResult;
  error?: string;
  errorSql?: string;
  errorKind?: ErrorKind;
  suggestions?: string[];
  isLoading?: boolean;
  timestamp: number;
}

export type ChartKind = "line" | "bar" | "bignumber" | "table";

export type ViewMode = "chart" | "table";

export type DbType = "postgresql" | "mysql" | "sqlite";

export type AiProvider = "gemini" | "openai" | "claude" | "custom";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  db_type: DbType;
  ai_provider: AiProvider;
  created_at: string;
}

/** Project shape returned to the config page - secrets are masked, never sent in full. */
export interface ProjectConfig extends Project {
  db_url_masked: string;
  has_ai_api_key: boolean;
  /** Base URL of the OpenAI-compatible endpoint, only used when ai_provider is "custom". */
  ai_base_url: string | null;
  /** Model name to request from the custom endpoint, only used when ai_provider is "custom". */
  ai_model: string | null;
}

export interface ChatHistoryItem {
  id: string;
  question: string;
  sql_generated: string | null;
  result_json: QueryResult | null;
  created_at: string;
}

export interface TableInfo {
  rowCount: number;
  columns: string[];
  sample: ResultRow[];
}

export interface SchemaColumn {
  name: string;
  type: string;
  isPK: boolean;
  isFK: boolean;
  foreignTable?: string;
  foreignColumn?: string;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

export interface SchemaResponse {
  tables: SchemaTable[];
}
