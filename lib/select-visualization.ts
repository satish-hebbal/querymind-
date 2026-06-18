import type { ResultRow } from "@/types";

export type VizType = "table" | "bar" | "line" | "bignumber" | "pie";

export interface VizConfig {
  type: VizType;
  x_column?: string;
  y_column?: string;
}

function isNumericCol(col: string, rows: ResultRow[]): boolean {
  const sample = rows.filter((r) => r[col] !== null);
  if (sample.length === 0) return false;
  return sample.every((r) => {
    const v = r[col];
    return typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)));
  });
}

function isDateCol(col: string): boolean {
  return /(date|time|_at|month|year|day|week|quarter)/i.test(col);
}

function isIdCol(col: string): boolean {
  return /^id$|_id$|uuid|_key$|_code$/i.test(col);
}

function isLabelCol(col: string): boolean {
  return /(name|label|title|type|category|status|city|country|region|product|client|event|vendor|brand|dept|team|role|gender|colour|color|source)/i.test(col);
}

function pickBestLabel(textCols: string[]): string | undefined {
  const sorted = [...textCols].sort((a, b) => {
    const score = (c: string) => (isLabelCol(c) ? 2 : isIdCol(c) ? -2 : 0);
    return score(b) - score(a);
  });
  return sorted[0];
}

/**
 * Detects explicit visualization keywords in the user's question.
 * Returns the requested viz type or null if no explicit request found.
 */
export function detectUserIntent(question: string): VizType | null {
  const q = question.toLowerCase();

  // Pie chart requests
  if (/\b(pie\s*chart|donut|doughnut|proporti|share\s*of|breakdown\s*by|percentage\s*of|part\s*of\s*whole)\b/i.test(q)) {
    return "pie";
  }

  // Bar chart requests
  if (/\b(bar\s*chart|bar\s*graph|horizontal\s*bar|column\s*chart|compare|comparison|ranking|ranked|top\s*\d|best|worst|most|least)\b/i.test(q)) {
    return "bar";
  }

  // Line chart / trend requests
  if (/\b(line\s*chart|line\s*graph|trend|over\s*time|timeline|trajectory|growth|change\s*over|history|monthly|weekly|daily|yearly)\b/i.test(q)) {
    return "line";
  }

  // Table requests
  if (/\b(table|list|show\s*all|all\s*rows|raw\s*data|detailed|record)\b/i.test(q)) {
    return "table";
  }

  // Big number requests
  if (/\b(how\s*many|total|count|sum|average|big\s*number|single|overall|grand\s*total)\b/i.test(q)) {
    return "bignumber";
  }

  return null;
}

/**
 * Picks the best visualization for a result set — server-side twin of detectChartKind.
 * Avoids UUID/ID columns as axis labels and prefers semantic label columns.
 *
 * When `question` is provided, explicit user keywords override auto-detection.
 */
export function selectVisualization(columns: string[], rows: ResultRow[], question?: string): VizConfig {
  if (rows.length === 0 || columns.length === 0) return { type: "table" };

  // Single scalar → big number
  if (rows.length === 1 && columns.length === 1) return { type: "bignumber" };

  const numericCols = columns.filter((c) => isNumericCol(c, rows));
  const dateCols = columns.filter((c) => isDateCol(c) && !isNumericCol(c, rows));
  const textCols = columns.filter((c) => !numericCols.includes(c) && !dateCols.includes(c));

  const bestLabel = pickBestLabel(textCols);
  const goodLabel = bestLabel && !isIdCol(bestLabel);

  // ── User intent override ────────────────────────────────────────────────────
  if (question) {
    const intent = detectUserIntent(question);
    if (intent === "pie" && goodLabel && numericCols.length === 1) {
      return { type: "pie", x_column: bestLabel, y_column: numericCols[0] };
    }
    if (intent === "bar" && goodLabel && numericCols.length > 0) {
      return { type: "bar", x_column: bestLabel, y_column: numericCols[0] };
    }
    if (intent === "line" && dateCols.length > 0 && numericCols.length > 0) {
      return { type: "line", x_column: dateCols[0], y_column: numericCols[0] };
    }
    if (intent === "line" && goodLabel && numericCols.length > 0) {
      // No date column, but the user explicitly asked for a line graph — honor
      // it using the categorical label as the x-axis rather than downgrading.
      return { type: "line", x_column: bestLabel, y_column: numericCols[0] };
    }
    if (intent === "line" && numericCols.length > 0) {
      // Last resort for an explicit line request: use the first column as x.
      return { type: "line", x_column: columns[0], y_column: numericCols[0] };
    }
    if (intent === "table") {
      return { type: "table" };
    }
    if (intent === "bignumber" && rows.length === 1 && numericCols.length >= 1) {
      return { type: "bignumber" };
    }
    // For bignumber intent with multiple rows, pick the largest numeric column
    if (intent === "bignumber" && rows.length > 1 && numericCols.length >= 1) {
      return { type: "bignumber" };
    }
  }

  // ── Auto-detection ──────────────────────────────────────────────────────────

  // Time series → line chart
  if (dateCols.length > 0 && numericCols.length > 0) {
    return { type: "line", x_column: dateCols[0], y_column: numericCols[0] };
  }

  // Part-of-whole → pie (categorical sets with single metric, up to 12 rows)
  if (goodLabel && numericCols.length === 1 && rows.length <= 12) {
    return { type: "pie", x_column: bestLabel, y_column: numericCols[0] };
  }

  // Categorical comparison → bar
  if (goodLabel && numericCols.length > 0) {
    return { type: "bar", x_column: bestLabel, y_column: numericCols[0] };
  }

  // Fallback
  return { type: "table" };
}
