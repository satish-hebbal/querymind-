"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CellValue, ChartKind, QueryResult, ResultRow } from "@/types";

const ACCENT = "#a8a29e";
const GRID_COLOR = "rgba(168, 162, 158, 0.15)";
const AXIS_COLOR = "#78716c";
const TOOLTIP_BG = "#1c1917";
const TOOLTIP_BORDER = "#44403c";
const TOOLTIP_TEXT = "#fafaf9";
const TOOLTIP_ITEM = "#d6d3d1";

const MAX_BARS = 10;

function truncateLabel(value: string, max = 14): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function formatValueLabel(value: number): string {
  return value.toLocaleString("en-IN");
}

interface CategoryTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
}

function CategoryTick({ x = 0, y = 0, payload }: CategoryTickProps) {
  const label = truncateLabel(String(payload?.value ?? ""));
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill={AXIS_COLOR} fontSize={12}>
      {label}
    </text>
  );
}

function isNumericValue(value: CellValue): boolean {
  if (typeof value === "number") return true;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return true;
  return false;
}

function isNumericColumn(column: string, rows: ResultRow[]): boolean {
  return rows.length > 0 && rows.every((row) => row[column] === null || isNumericValue(row[column]));
}

function isDateColumn(column: string, rows: ResultRow[]): boolean {
  const looksLikeDateName = /(date|time|_at|month|year|day)/i.test(column);
  if (!looksLikeDateName) return false;

  return rows.every((row) => {
    const value = row[column];
    if (value === null) return true;
    if (typeof value === "number" || typeof value === "boolean") return false;
    return !Number.isNaN(Date.parse(String(value)));
  });
}

/**
 * Decides which visualization best fits a result set:
 * - date column + numeric column -> line chart
 * - text column + numeric column -> bar chart
 * - single row, single column -> big number
 * - otherwise -> table
 */
export function detectChartKind(columns: string[], rows: ResultRow[]): ChartKind {
  if (rows.length === 0 || columns.length === 0) return "table";

  if (rows.length === 1 && columns.length === 1) {
    return "bignumber";
  }

  const numericColumns = columns.filter((column) => isNumericColumn(column, rows));
  const dateColumn = columns.find((column) => isDateColumn(column, rows));
  const numericForLine = numericColumns.find((column) => column !== dateColumn);

  if (dateColumn && numericForLine) {
    return "line";
  }

  const textColumn = columns.find((column) => !numericColumns.includes(column));

  if (textColumn && numericColumns.length > 0) {
    return "bar";
  }

  return "table";
}

function toNumber(value: CellValue): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function formatDateLabel(value: CellValue): string {
  if (value === null) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function formatBigNumber(value: CellValue): string {
  if (value === null) return "—";
  if (typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)))) {
    return Number(value).toLocaleString("en-IN");
  }
  return String(value);
}

interface ResultChartProps {
  result: QueryResult;
}

export default function ResultChart({ result }: ResultChartProps) {
  const { columns, rows } = result;
  const kind = detectChartKind(columns, rows);

  if (kind === "bignumber") {
    const column = columns[0];
    const value = rows[0]?.[column];

    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface px-6 py-10 text-center shadow-glow-sm">
        <span className="text-4xl font-bold text-ink sm:text-5xl">{formatBigNumber(value)}</span>
        <span className="text-sm text-ink-secondary">{column}</span>
      </div>
    );
  }

  const numericColumns = columns.filter((column) => isNumericColumn(column, rows));

  if (kind === "line") {
    const dateColumn = columns.find((column) => isDateColumn(column, rows)) as string;
    const valueColumn = (numericColumns.find((column) => column !== dateColumn) ?? numericColumns[0]) as string;

    const data = rows.map((row) => ({
      label: formatDateLabel(row[dateColumn]),
      value: toNumber(row[valueColumn]),
    }));

    return (
      <div className="h-72 w-full rounded-lg border border-border bg-surface p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="label" stroke={AXIS_COLOR} fontSize={12} tickMargin={8} />
            <YAxis stroke={AXIS_COLOR} fontSize={12} width={64} />
            <Tooltip
              contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, borderRadius: 8 }}
              labelStyle={{ color: TOOLTIP_TEXT }}
              itemStyle={{ color: TOOLTIP_ITEM }}
            />
            <Line type="monotone" dataKey="value" name={valueColumn} stroke={ACCENT} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "bar") {
    const textColumn = columns.find((column) => !numericColumns.includes(column)) as string;
    const valueColumn = numericColumns[0];

    const allData = rows.map((row) => ({
      label: String(row[textColumn] ?? ""),
      value: toNumber(row[valueColumn]),
    }));

    const data = allData.slice(0, MAX_BARS);
    const longestLabel = data.reduce((max, item) => Math.max(max, truncateLabel(item.label).length), 0);
    const axisWidth = Math.min(140, Math.max(70, longestLabel * 7 + 24));
    const chartHeight = Math.max(180, data.length * 42 + 24);

    return (
      <div className="w-full overflow-x-auto rounded-lg border border-border bg-surface p-4">
        <div className="min-w-[280px]" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis type="number" stroke={AXIS_COLOR} fontSize={12} />
              <YAxis
                type="category"
                dataKey="label"
                stroke={AXIS_COLOR}
                fontSize={12}
                width={axisWidth}
                tick={<CategoryTick />}
              />
              <Tooltip
                contentStyle={{ backgroundColor: TOOLTIP_BG, border: `1px solid ${TOOLTIP_BORDER}`, borderRadius: 8 }}
                labelStyle={{ color: TOOLTIP_TEXT }}
                itemStyle={{ color: TOOLTIP_ITEM }}
              />
              <Bar dataKey="value" name={valueColumn} fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={28}>
                <LabelList dataKey="value" position="right" fill={AXIS_COLOR} fontSize={11} formatter={formatValueLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {allData.length > MAX_BARS && (
          <p className="mt-2 text-center text-xs text-ink-dim">
            Showing top {MAX_BARS} of {allData.length} rows
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-ink-secondary">
      No chart available for this result.
    </div>
  );
}
