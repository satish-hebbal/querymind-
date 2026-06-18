import type { ResultRow } from "@/types";
import { detectUserIntent } from "./select-visualization";

/**
 * Spec-driven generative UI. Instead of asking the (slow) model to write raw
 * React, it returns a tiny JSON spec describing WHICH interactive layout to use
 * and how to map columns onto it. We render that spec with prebuilt, themed,
 * interactive components — fast (a few hundred tokens), always on-theme, and it
 * always renders.
 */
export type VizLayout =
  | "kpi" // single big number(s) / stat tiles
  | "leaderboard" // ranked list with animated bars
  | "comparison" // a few highlighted items side by side
  | "cards" // grid of clickable detail cards
  | "breakdown" // share / proportion of a whole
  | "stacked" // multiple numeric series stacked per item
  | "bullet" // metric vs a target / average reference
  | "heatmap" // intensity grid (matrix or single-series)
  | "line"
  | "area"
  | "bar"
  | "pie"
  | "table";

export interface VizSpec {
  layout: VizLayout;
  title?: string;
  /** Category / label column (x-axis, card title, row label). */
  label?: string;
  /** Primary numeric column to emphasize. */
  metric?: string;
  /** Optional secondary numeric column shown alongside the metric. */
  secondary?: string;
  sort?: "asc" | "desc" | "none";
  /** Highlight the top N rows (leaderboard/cards). */
  highlightTop?: number;
}

const LAYOUTS: VizLayout[] = [
  "kpi",
  "leaderboard",
  "comparison",
  "cards",
  "breakdown",
  "stacked",
  "bullet",
  "heatmap",
  "line",
  "area",
  "bar",
  "pie",
  "table",
];

/** A user-forced visualization choice from the chat-box picker ("auto" = let AI decide). */
export type ForcedViz = "auto" | VizLayout;

/** Options shown in the chat-box visualization picker, in display order. */
export const FORCED_VIZ_OPTIONS: { value: ForcedViz; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Let the AI pick the best visualization" },
  { value: "leaderboard", label: "Leaderboard", hint: "Ranked list with bars" },
  { value: "bar", label: "Bar chart", hint: "Compare values across categories" },
  { value: "line", label: "Line chart", hint: "Trend over an ordered axis" },
  { value: "area", label: "Area chart", hint: "Trend with filled magnitude" },
  { value: "pie", label: "Pie / Donut", hint: "Share of a whole" },
  { value: "breakdown", label: "Breakdown", hint: "Proportions as percentages" },
  { value: "stacked", label: "Stacked bar", hint: "Multiple measures per item" },
  { value: "bullet", label: "Bullet", hint: "Value vs target / average" },
  { value: "heatmap", label: "Heatmap", hint: "Intensity grid / matrix" },
  { value: "comparison", label: "Comparison", hint: "A few items side by side" },
  { value: "cards", label: "Cards", hint: "Browsable grid of items" },
  { value: "kpi", label: "Big numbers", hint: "Headline KPI stats" },
  { value: "table", label: "Table", hint: "Raw tabular detail" },
];

/** Resolves a forced picker choice to a concrete layout, or null for "auto"/invalid. */
export function resolveForcedViz(forced?: string | null): VizLayout | null {
  if (!forced || forced === "auto") return null;
  return LAYOUTS.includes(forced as VizLayout) ? (forced as VizLayout) : null;
}

export function isNumericCol(col: string, rows: ResultRow[]): boolean {
  const sample = rows.filter((r) => r[col] !== null && r[col] !== undefined);
  if (sample.length === 0) return false;
  return sample.every((r) => {
    const v = r[col];
    return typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)));
  });
}

function isIdCol(col: string): boolean {
  return /^id$|_id$|uuid|_key$|_code$/i.test(col);
}

function isLabelCol(col: string): boolean {
  return /(name|label|title|type|category|status|city|country|region|product|client|event|venue|vendor|brand|dept|team|role|month|year|date)/i.test(
    col
  );
}

function pickLabel(textCols: string[]): string | undefined {
  const sorted = [...textCols].sort((a, b) => {
    const score = (c: string) => (isLabelCol(c) ? 2 : isIdCol(c) ? -2 : 0);
    return score(b) - score(a);
  });
  return sorted[0];
}

/** Maps an explicit user chart request to a layout, so "line graph" stays a line. */
function intentLayout(question: string): VizLayout | null {
  const intent = detectUserIntent(question);
  if (intent === "line") return "line";
  if (intent === "bar") return "bar";
  if (intent === "pie") return "pie";
  if (intent === "table") return "table";
  if (intent === "bignumber") return "kpi";
  return null;
}

/** Instructions appended to the model prompt so it returns a compact JSON spec. */
export function buildSpecInstructions(question: string, forced?: string | null): string {
  const forcedLayout = resolveForcedViz(forced);
  const requested = forcedLayout ?? intentLayout(question);
  const requestedBlock = requested
    ? `The user selected a "${requested}" visualization — you MUST set "layout" to "${requested}" and pick the most suitable "label"/"metric" columns for it.`
    : `No specific chart was requested. Choose the layout that best reveals the answer. Prefer the richer interactive layouts (leaderboard, comparison, cards, kpi, breakdown) over a plain bar/table when they fit.`;

  return `Return a COMPACT JSON object (no prose, no markdown fences) describing how to visualize the result, plus a one-sentence answer.

Available "layout" values and when to use them:
- "kpi": one or a few headline numbers (single-row aggregates, totals, counts).
- "leaderboard": a ranked list of items by a metric (top/bottom N, rankings). Great default for "each X with its metric".
- "comparison": spotlight a few items side by side (e.g. highest vs lowest).
- "cards": a browsable grid of items, each with several attributes.
- "breakdown": share / proportion of a whole (percentages of a total).
- "stacked": several numeric measures composing each item (e.g. gross + net + fees per item).
- "bullet": a value measured against a target/average reference per item.
- "heatmap": intensity grid — best when there are TWO categorical columns + one numeric (a matrix), or one category whose intensity matters.
- "line": a trend over an ordered/date axis.
- "area": a trend where the filled magnitude matters.
- "bar": simple magnitude comparison across categories.
- "pie": part-to-whole for a few categories.
- "table": only when the data is truly tabular detail with no clear metric.

${requestedBlock}

Output EXACTLY this JSON shape (omit fields that don't apply):
{
  "summary": "<one sentence answering the question, with specific numbers>",
  "layout": "<one of the values above>",
  "title": "<short title, max ~6 words>",
  "label": "<the column holding item names/labels>",
  "metric": "<the primary numeric column to emphasize>",
  "secondary": "<an optional second numeric column, or omit>",
  "sort": "desc" | "asc" | "none",
  "highlightTop": <integer, optional>
}

Use column names EXACTLY as given. Never use an id/uuid column as the label. Output ONLY the JSON.`;
}

/** Extracts the first JSON object from a model response. */
export function parseSpecResponse(raw: string): { summary?: string } & Partial<VizSpec> {
  if (!raw) return {};
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    const out: { summary?: string } & Partial<VizSpec> = {};
    if (typeof obj.summary === "string") out.summary = obj.summary;
    if (typeof obj.layout === "string" && LAYOUTS.includes(obj.layout as VizLayout)) out.layout = obj.layout as VizLayout;
    if (typeof obj.title === "string") out.title = obj.title;
    if (typeof obj.label === "string") out.label = obj.label;
    if (typeof obj.metric === "string") out.metric = obj.metric;
    if (typeof obj.secondary === "string") out.secondary = obj.secondary;
    if (obj.sort === "asc" || obj.sort === "desc" || obj.sort === "none") out.sort = obj.sort;
    if (typeof obj.highlightTop === "number") out.highlightTop = obj.highlightTop;
    return out;
  } catch {
    return {};
  }
}

/**
 * Validates the (possibly partial/AI-supplied) spec against the actual columns
 * and fills in sensible, rich defaults so something good always renders — even
 * when the model returns nothing.
 */
export function normalizeSpec(
  raw: Partial<VizSpec> | null | undefined,
  columns: string[],
  rows: ResultRow[],
  question?: string,
  forcedViz?: string | null
): VizSpec {
  const spec: Partial<VizSpec> = { ...(raw ?? {}) };

  const valid = (c?: string): c is string => !!c && columns.includes(c);
  const numericCols = columns.filter((c) => isNumericCol(c, rows));
  const textCols = columns.filter((c) => !numericCols.includes(c));

  // Resolve columns, repairing anything the model got wrong.
  let metric = valid(spec.metric) && numericCols.includes(spec.metric) ? spec.metric : numericCols[0];
  let label = valid(spec.label) && !isIdCol(spec.label) ? spec.label : pickLabel(textCols);
  const secondary =
    valid(spec.secondary) && numericCols.includes(spec.secondary) && spec.secondary !== metric
      ? spec.secondary
      : numericCols.find((c) => c !== metric);

  // Precedence: explicit picker choice → the spec's own layout → typed-intent
  // (e.g. "as a line graph") → heuristic default.
  const forced = resolveForcedViz(forcedViz) ?? (spec.layout && LAYOUTS.includes(spec.layout) ? spec.layout : null) ?? (question ? intentLayout(question) : null);
  let layout: VizLayout = forced ?? "leaderboard";

  // Fall back to a sensible layout when the chosen one can't be rendered.
  const hasMetric = !!metric;
  const hasLabel = !!label;

  if (!forced) {
    if (rows.length === 1 && numericCols.length >= 1 && !hasLabel) {
      layout = "kpi";
    } else if (!hasMetric) {
      layout = "table";
    } else if (!hasLabel) {
      layout = numericCols.length > 1 ? "kpi" : "bar";
    } else if (!LAYOUTS.includes(layout)) {
      layout = "leaderboard";
    }
  } else if (forced === "kpi" && !hasMetric) {
    layout = "table";
  }

  // Final guards for layouts that need both label + metric.
  if (
    ["leaderboard", "comparison", "cards", "breakdown", "bar", "pie", "line", "area", "bullet", "heatmap", "stacked"].includes(layout) &&
    (!hasMetric || !hasLabel)
  ) {
    layout = hasMetric ? "kpi" : "table";
  }

  if (!metric) metric = numericCols[0];
  if (!label) label = textCols[0] ?? columns[0];

  return {
    layout,
    title: spec.title,
    label,
    metric,
    secondary,
    sort: spec.sort ?? "desc",
    highlightTop: spec.highlightTop,
  };
}
