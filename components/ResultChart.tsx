"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CellValue, ChartKind, QueryResult, ResultRow } from "@/types";

const ACCENT = "#6366f1";

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
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface px-6 py-10 text-center">
        <span className="text-4xl font-bold text-accent sm:text-5xl">{formatBigNumber(value)}</span>
        <span className="text-sm text-gray-400">{column}</span>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} tickMargin={8} />
            <YAxis stroke="#9ca3af" fontSize={12} width={64} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }}
              labelStyle={{ color: "#e5e7eb" }}
              itemStyle={{ color: "#e5e7eb" }}
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

    const data = rows.map((row) => ({
      label: String(row[textColumn] ?? ""),
      value: toNumber(row[valueColumn]),
    }));

    return (
      <div className="h-72 w-full rounded-lg border border-border bg-surface p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="label"
              stroke="#9ca3af"
              fontSize={11}
              tickMargin={8}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={70}
            />
            <YAxis stroke="#9ca3af" fontSize={12} width={64} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }}
              labelStyle={{ color: "#e5e7eb" }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Bar dataKey="value" name={valueColumn} fill={ACCENT} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-gray-400">
      No chart available for this result.
    </div>
  );
}
