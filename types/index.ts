export type CellValue = string | number | boolean | null;

export type ResultRow = Record<string, CellValue>;

export interface QueryResult {
  sql: string;
  columns: string[];
  rows: ResultRow[];
  rowCount: number;
}

export interface QueryApiResponse {
  sql: string;
  columns: string[];
  rows: ResultRow[];
  rowCount: number;
  error?: undefined;
}

export interface QueryApiError {
  error: string;
  sql?: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  result?: QueryResult;
  error?: string;
  errorSql?: string;
  isLoading?: boolean;
  timestamp: number;
}

export type ChartKind = "line" | "bar" | "bignumber" | "table";

export type ViewMode = "chart" | "table";

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
