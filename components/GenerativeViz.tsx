"use client";

import { ArrowDownUp, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CellValue, QueryResult, ResultRow } from "@/types";
import { normalizeSpec, type VizSpec } from "@/lib/viz-spec";
import { seriesColors, tint, VIZ_PRIMARY } from "@/lib/viz-colors";
import ResultChart from "./ResultChart";
import ResultTable from "./ResultTable";

interface GenerativeVizProps {
  spec?: Partial<VizSpec> | null;
  data: ResultRow[];
  columns: string[];
  question?: string;
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function toNumber(v: CellValue): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return 0;
}

function fmt(v: CellValue): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString("en-IN");
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v).toLocaleString("en-IN");
  return String(v);
}

/** Compact number for tight spaces: 1.2M, 850k, 1.8k. */
function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${(n / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return n.toLocaleString("en-IN");
}

function humanize(col: string): string {
  return col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

/* ── shell ────────────────────────────────────────────────────────────────── */

export default function GenerativeViz({ spec, data, columns, question }: GenerativeVizProps) {
  const norm = useMemo(() => normalizeSpec(spec, columns, data, question), [spec, columns, data, question]);

  const body = (() => {
    switch (norm.layout) {
      case "kpi":
        return <KpiView spec={norm} data={data} columns={columns} />;
      case "leaderboard":
        return <LeaderboardView spec={norm} data={data} columns={columns} />;
      case "comparison":
        return <ComparisonView spec={norm} data={data} columns={columns} />;
      case "cards":
        return <CardsView spec={norm} data={data} columns={columns} />;
      case "breakdown":
        return <BreakdownView spec={norm} data={data} />;
      case "pie":
        return <DonutView spec={norm} data={data} />;
      case "stacked":
        return <StackedView spec={norm} data={data} columns={columns} />;
      case "bullet":
        return <BulletView spec={norm} data={data} />;
      case "heatmap":
        return <HeatmapView spec={norm} data={data} columns={columns} />;
      case "table":
        return <div className="p-1.5"><ResultTable result={{ sql: "", columns, rows: data, rowCount: data.length }} /></div>;
      default:
        return (
          <div className="p-1.5">
            <ResultChart
              result={{ sql: "", columns, rows: data, rowCount: data.length } as QueryResult}
              vizConfig={{ type: norm.layout as "line" | "area" | "bar" | "pie", x_column: norm.label, y_column: norm.metric }}
            />
          </div>
        );
    }
  })();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-glow-sm">
      {norm.title && (
        <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-1">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">{norm.title}</h3>
          <span className="shrink-0 text-[11px] text-ink-dim">{data.length} {data.length === 1 ? "row" : "rows"}</span>
        </div>
      )}
      {body}
    </div>
  );
}

/* ── shared controls ──────────────────────────────────────────────────────── */

type SortMode = "value-desc" | "value-asc" | "label";

function Toolbar({
  query,
  onQuery,
  sort,
  onSort,
  showSort = true,
  right,
}: {
  query: string;
  onQuery: (v: string) => void;
  sort: SortMode;
  onSort: (s: SortMode) => void;
  showSort?: boolean;
  right?: ReactNode;
}) {
  const nextSort: Record<SortMode, SortMode> = {
    "value-desc": "value-asc",
    "value-asc": "label",
    label: "value-desc",
  };
  const sortLabel: Record<SortMode, string> = {
    "value-desc": "High → Low",
    "value-asc": "Low → High",
    label: "A → Z",
  };
  return (
    <div className="flex items-center gap-2 px-4 pb-2 pt-1">
      <div className="relative flex-1">
        <Search size={13} strokeWidth={1.5} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-dim" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Filter…"
          className="w-full rounded-lg border border-border bg-surface/80 py-1.5 pl-7 pr-2 text-xs text-ink placeholder-ink-dim transition-colors focus:border-border-bright focus:outline-none"
        />
      </div>
      {showSort && (
        <button
          type="button"
          onClick={() => onSort(nextSort[sort])}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-ink-secondary transition-colors hover:border-border-bright hover:text-ink"
          title="Change sort order"
        >
          <ArrowDownUp size={12} strokeWidth={1.5} />
          {sortLabel[sort]}
        </button>
      )}
      {right}
    </div>
  );
}

function useFilterSort(data: ResultRow[], labelCol: string, metricCol: string, initial: SortMode = "value-desc") {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>(initial);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = q ? data.filter((r) => String(r[labelCol] ?? "").toLowerCase().includes(q)) : [...data];
    arr.sort((a, b) => {
      if (sort === "label") return String(a[labelCol] ?? "").localeCompare(String(b[labelCol] ?? ""));
      const diff = toNumber(b[metricCol]) - toNumber(a[metricCol]);
      return sort === "value-asc" ? -diff : diff;
    });
    return arr;
  }, [data, labelCol, metricCol, query, sort]);
  return { query, setQuery, sort, setSort, rows };
}

/* ── KPI ──────────────────────────────────────────────────────────────────── */

function KpiView({ spec, data, columns }: { spec: VizSpec; data: ResultRow[]; columns: string[] }) {
  const numericCols = columns.filter((c) => data.some((r) => typeof r[c] === "number" || (typeof r[c] === "string" && r[c] !== "" && !isNaN(Number(r[c])))));
  const tiles =
    data.length === 1
      ? (numericCols.length ? numericCols : columns).map((c) => ({ label: humanize(c), value: data[0][c] }))
      : [{ label: humanize(spec.metric ?? numericCols[0] ?? columns[0]), value: data[0]?.[spec.metric ?? numericCols[0] ?? columns[0]] }];

  const colors = seriesColors(Math.max(tiles.length, 1));
  return (
    <div className={`grid gap-3 p-4 ${tiles.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
      {tiles.map((t, i) => (
        <KpiTile key={i} label={t.label} value={t.value} color={colors[i] ?? VIZ_PRIMARY} />
      ))}
    </div>
  );
}

function KpiTile({ label, value, color }: { label: string; value: CellValue; color: string }) {
  const numeric = typeof value === "number" || (typeof value === "string" && value !== "" && !isNaN(Number(value)));
  const animated = useCountUp(numeric ? toNumber(value) : 0);
  return (
    <div
      className="relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-border bg-surface/60 px-5 py-5"
      style={{ background: `linear-gradient(135deg, ${tint(color, 0.12)}, transparent 70%)` }}
    >
      <span className="h-1 w-8 rounded-full" style={{ backgroundColor: color }} />
      <span className="mt-1 text-[28px] font-bold leading-none tracking-tight text-ink sm:text-[32px]">
        {numeric ? Math.round(animated).toLocaleString("en-IN") : fmt(value)}
      </span>
      <span className="text-xs text-ink-secondary">{label}</span>
    </div>
  );
}

/* ── Leaderboard ──────────────────────────────────────────────────────────── */

function LeaderboardView({ spec, data, columns }: { spec: VizSpec; data: ResultRow[]; columns: string[] }) {
  const label = spec.label!;
  const metric = spec.metric!;
  const secondary = spec.secondary && spec.secondary !== metric ? spec.secondary : undefined;
  const { query, setQuery, sort, setSort, rows } = useFilterSort(data, label, metric, spec.sort === "asc" ? "value-asc" : "value-desc");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [topN, setTopN] = useState(Math.min(rows.length, 10));

  const max = Math.max(...rows.map((r) => toNumber(r[metric])), 1);
  const otherCols = columns.filter((c) => c !== label);
  const visible = rows.slice(0, topN);
  const showControls = data.length > 6;

  return (
    <div>
      {showControls && (
        <Toolbar
          query={query}
          onQuery={setQuery}
          sort={sort}
          onSort={setSort}
          right={
            rows.length > 5 ? (
              <label className="flex shrink-0 items-center gap-2 text-[11px] text-ink-dim">
                Top {topN}
                <input
                  type="range"
                  min={3}
                  max={rows.length}
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                  className="h-1 w-20 cursor-pointer accent-[#7c6cf5]"
                />
              </label>
            ) : null
          }
        />
      )}
      <div className="flex flex-col gap-0.5 p-2">
        {visible.map((row, rank) => {
          const value = toNumber(row[metric]);
          const pct = (value / max) * 100;
          const open = openIdx === rank;
          return (
            <div key={rank}>
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : rank)}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-elevated/50"
              >
                <span className="w-4 shrink-0 text-right text-[11px] tabular-nums text-ink-dim">{rank + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] text-ink">{fmt(row[label])}</span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      {secondary && (
                        <span className="text-[11px] tabular-nums text-ink-dim">{compact(toNumber(row[secondary]))} {humanize(secondary).toLowerCase()}</span>
                      )}
                      <span className="text-[13px] font-semibold tabular-nums text-ink">{fmt(row[metric])}</span>
                    </span>
                  </div>
                  {/* value bar over a faint track */}
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: tint(VIZ_PRIMARY, 0.12) }}>
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out group-hover:brightness-110"
                      style={{ width: `${pct}%`, backgroundColor: VIZ_PRIMARY }}
                    />
                  </div>
                </div>
                <ChevronDown size={14} strokeWidth={1.5} className={`shrink-0 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <dl className="mx-3 mb-1.5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-surface/60 px-4 py-3 text-xs sm:grid-cols-3">
                  {otherCols.map((c) => (
                    <div key={c} className="min-w-0">
                      <dt className="truncate text-ink-dim">{humanize(c)}</dt>
                      <dd className="truncate text-ink-secondary">{fmt(row[c])}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
        {visible.length === 0 && <p className="px-3 py-6 text-center text-xs text-ink-dim">No matches for “{query}”.</p>}
      </div>
    </div>
  );
}

/* ── Comparison ───────────────────────────────────────────────────────────── */

function ComparisonView({ spec, data, columns }: { spec: VizSpec; data: ResultRow[]; columns: string[] }) {
  const label = spec.label!;
  const metric = spec.metric!;
  const sorted = [...data].sort((a, b) => toNumber(b[metric]) - toNumber(a[metric]));
  const picks = sorted.length <= 3 ? sorted : [sorted[0], sorted[sorted.length - 1]];
  const max = Math.max(...picks.map((r) => toNumber(r[metric])), 1);
  const min = Math.min(...picks.map((r) => toNumber(r[metric])));
  const otherCols = columns.filter((c) => c !== label && c !== metric);
  const colors = seriesColors(picks.length);
  const ratio = min > 0 ? max / min : 0;

  return (
    <div className="p-4">
      {picks.length === 2 && ratio > 0 && (
        <p className="mb-3 text-xs text-ink-secondary">
          Top is <span className="font-semibold text-ink">{ratio.toFixed(1)}×</span> the bottom
          <span className="text-ink-dim"> · gap of {compact(max - min)}</span>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {picks.map((row, i) => {
          const value = toNumber(row[metric]);
          const color = colors[i] ?? VIZ_PRIMARY;
          return (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-surface/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-ink">{fmt(row[label])}</span>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ backgroundColor: tint(color, 0.18), color }}>
                  {i === 0 ? "Highest" : i === picks.length - 1 ? "Lowest" : "Mid"}
                </span>
              </div>
              <span className="text-3xl font-bold tracking-tight text-ink">{fmt(row[metric])}</span>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: tint(color, 0.14) }}>
                <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
              </div>
              {otherCols.length > 0 && (
                <dl className="mt-1 space-y-1.5 text-xs">
                  {otherCols.slice(0, 4).map((c) => (
                    <div key={c} className="flex items-center justify-between gap-2">
                      <dt className="text-ink-dim">{humanize(c)}</dt>
                      <dd className="truncate text-ink-secondary">{fmt(row[c])}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Cards ────────────────────────────────────────────────────────────────── */

function CardsView({ spec, data, columns }: { spec: VizSpec; data: ResultRow[]; columns: string[] }) {
  const label = spec.label!;
  const metric = spec.metric;
  const { query, setQuery, sort, setSort, rows } = useFilterSort(data, label, metric ?? label, "value-desc");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const otherCols = columns.filter((c) => c !== label && c !== metric);
  const visible = rows.slice(0, 24);
  const showControls = data.length > 6;

  return (
    <div>
      {showControls && <Toolbar query={query} onQuery={setQuery} sort={sort} onSort={setSort} showSort={!!metric} />}
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((row, i) => {
          const open = openIdx === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface/60 p-4 text-left transition-all hover:border-border-bright hover:bg-elevated/40"
              style={{ borderLeft: `3px solid ${VIZ_PRIMARY}` }}
            >
              <span className="truncate text-[13px] font-medium text-ink">{fmt(row[label])}</span>
              {metric && <span className="text-2xl font-bold tracking-tight text-ink">{fmt(row[metric])}</span>}
              {metric && <span className="text-[11px] text-ink-dim">{humanize(metric)}</span>}
              {open && otherCols.length > 0 && (
                <dl className="mt-1.5 space-y-1.5 border-t border-border pt-2.5 text-xs">
                  {otherCols.map((c) => (
                    <div key={c} className="flex items-center justify-between gap-2">
                      <dt className="text-ink-dim">{humanize(c)}</dt>
                      <dd className="truncate text-ink-secondary">{fmt(row[c])}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </button>
          );
        })}
        {visible.length === 0 && <p className="col-span-full px-3 py-6 text-center text-xs text-ink-dim">No matches for “{query}”.</p>}
      </div>
    </div>
  );
}

/* ── Breakdown (interactive share of whole) ───────────────────────────────── */

function BreakdownView({ spec, data }: { spec: VizSpec; data: ResultRow[] }) {
  const label = spec.label!;
  const metric = spec.metric!;
  const all = useMemo(() => [...data].sort((a, b) => toNumber(b[metric]) - toNumber(a[metric])).slice(0, 12), [data, metric]);
  const colors = seriesColors(all.length);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [hover, setHover] = useState<number | null>(null);

  const active = all.map((_, i) => i).filter((i) => !hidden.has(i));
  const total = active.reduce((s, i) => s + toNumber(all[i][metric]), 0) || 1;

  const toggle = (i: number) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (active.length > 1) next.add(i);
      return next;
    });

  return (
    <div className="p-4">
      <div className="mb-4 flex h-3.5 w-full items-center gap-1">
        {all.map((row, i) =>
          hidden.has(i) ? null : (
            <div
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="h-full rounded-full transition-all duration-300"
              style={{
                // subtract the inter-segment gaps so the pills fit exactly
                width: `calc((100% - ${(active.length - 1) * 4}px) * ${toNumber(row[metric]) / total})`,
                backgroundColor: colors[i],
                opacity: hover === null || hover === i ? 1 : 0.3,
                transform: hover === i ? "scaleY(1.25)" : undefined,
              }}
            />
          )
        )}
      </div>
      <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {all.map((row, i) => {
          const off = hidden.has(i);
          const pct = off ? 0 : (toNumber(row[metric]) / total) * 100;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-elevated/50 ${hover === i ? "bg-elevated/50" : ""}`}
              >
                <span className={`flex min-w-0 items-center gap-2 ${off ? "opacity-40" : ""}`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colors[i] }} />
                  <span className={`truncate ${off ? "text-ink-dim line-through" : "text-ink-secondary"}`}>{fmt(row[label])}</span>
                </span>
                <span className={`shrink-0 font-medium tabular-nums ${off ? "text-ink-dim" : "text-ink"}`}>{off ? "—" : `${pct.toFixed(1)}%`}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 px-2 text-[11px] text-ink-dim">Click a category to include/exclude it</p>
    </div>
  );
}

/* ── Stacked (multiple measures per item) ─────────────────────────────────── */

function StackedView({ spec, data, columns }: { spec: VizSpec; data: ResultRow[]; columns: string[] }) {
  const label = spec.label!;
  const numericCols = columns.filter(
    (c) => c !== label && data.some((r) => typeof r[c] === "number" || (typeof r[c] === "string" && r[c] !== "" && !isNaN(Number(r[c]))))
  );
  const series = numericCols.slice(0, 6);
  const colors = seriesColors(series.length);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);

  const active = series.filter((s) => !hidden.has(s));
  const rows = useMemo(() => {
    const totalOf = (r: ResultRow) => active.reduce((s, c) => s + toNumber(r[c]), 0);
    return [...data].sort((a, b) => totalOf(b) - totalOf(a)).slice(0, 15);
  }, [data, active]);
  const maxTotal = Math.max(...rows.map((r) => active.reduce((s, c) => s + toNumber(r[c]), 0)), 1);

  const toggle = (s: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else if (active.length > 1) next.add(s);
      return next;
    });

  // Single numeric column → there's nothing to stack; show as a leaderboard instead.
  if (series.length < 2) return <LeaderboardView spec={spec} data={data} columns={columns} />;

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {series.map((s, i) => {
          const off = hidden.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={`flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] transition-colors hover:border-border-bright ${off ? "opacity-40" : ""}`}
            >
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors[i] }} />
              <span className={off ? "text-ink-dim line-through" : "text-ink-secondary"}>{humanize(s)}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((row, ri) => {
          const total = active.reduce((s, c) => s + toNumber(row[c]), 0);
          return (
            <div key={ri} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-right text-[12px] text-ink-secondary sm:w-36">{fmt(row[label])}</span>
              <div className="flex h-5 flex-1 overflow-hidden rounded-md" style={{ backgroundColor: tint(VIZ_PRIMARY, 0.08), width: `${(total / maxTotal) * 100}%` }}>
                {series.map((s, i) =>
                  hidden.has(s) ? null : (
                    <div
                      key={s}
                      title={`${humanize(s)}: ${fmt(row[s])}`}
                      className="h-full transition-opacity"
                      style={{
                        width: `${total > 0 ? (toNumber(row[s]) / total) * 100 : 0}%`,
                        backgroundColor: colors[i],
                        opacity: hover === null || hover === i ? 1 : 0.3,
                      }}
                    />
                  )
                )}
              </div>
              <span className="w-16 shrink-0 text-right text-[12px] font-medium tabular-nums text-ink">{compact(total)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 px-1 text-[11px] text-ink-dim">Click a measure to toggle it · hover to isolate</p>
    </div>
  );
}

/* ── Bullet (value vs target / average) ───────────────────────────────────── */

function BulletView({ spec, data }: { spec: VizSpec; data: ResultRow[] }) {
  const label = spec.label!;
  const metric = spec.metric!;
  const target = spec.secondary && spec.secondary !== metric ? spec.secondary : undefined;
  const rows = useMemo(() => [...data].sort((a, b) => toNumber(b[metric]) - toNumber(a[metric])).slice(0, 15), [data, metric]);
  const avg = rows.reduce((s, r) => s + toNumber(r[metric]), 0) / (rows.length || 1);
  const scaleMax = Math.max(...rows.map((r) => Math.max(toNumber(r[metric]), target ? toNumber(r[target]) : avg)), 1);

  return (
    <div className="p-4">
      <p className="mb-3 text-xs text-ink-secondary">
        Bar = <span className="text-ink">{humanize(metric)}</span> · marker ={" "}
        {target ? <span className="text-ink">{humanize(target)}</span> : <>average <span className="text-ink-dim">({compact(Math.round(avg))})</span></>}
        <span className="text-ink-dim"> · green = at/above, coral = below</span>
      </p>
      <div className="flex flex-col gap-3">
        {rows.map((row, i) => {
          const value = toNumber(row[metric]);
          const ref = target ? toNumber(row[target]) : avg;
          const ahead = value >= ref;
          const color = ahead ? "#4ade80" : "#fb7185";
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-right text-[12px] text-ink-secondary sm:w-40">{fmt(row[label])}</span>
              <div className="relative h-5 flex-1 overflow-hidden rounded-md" style={{ backgroundColor: tint(VIZ_PRIMARY, 0.08) }}>
                <div className="h-full rounded-md transition-[width] duration-700 ease-out" style={{ width: `${(value / scaleMax) * 100}%`, backgroundColor: color }} />
                <span className="absolute top-0 h-full w-0.5 bg-ink" style={{ left: `${(ref / scaleMax) * 100}%` }} title={`${target ? humanize(target) : "avg"}: ${fmt(Math.round(ref))}`} />
              </div>
              <span className="w-16 shrink-0 text-right text-[12px] font-medium tabular-nums text-ink">{compact(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Heatmap (matrix intensity, or single-series intensity grid) ──────────── */

function HeatmapView({ spec, data, columns }: { spec: VizSpec; data: ResultRow[]; columns: string[] }) {
  const metric = spec.metric!;
  const isId = (c: string) => /^id$|_id$|uuid|_key$|_code$/i.test(c);
  const isNumeric = (c: string) => data.some((r) => typeof r[c] === "number" || (typeof r[c] === "string" && r[c] !== "" && !isNaN(Number(r[c]))));
  // Categorical dimensions only — never numeric columns and never id/uuid columns.
  const textCols = columns.filter((c) => (c === spec.label || !isNumeric(c)) && !isId(c));
  const rowDim = spec.label && !isId(spec.label) ? spec.label : textCols[0];
  const colDim = textCols.find((c) => c !== rowDim);

  const shade = (ratio: number) => tint(VIZ_PRIMARY, 0.12 + 0.78 * ratio);

  // Matrix mode — two categorical dimensions.
  if (colDim) {
    const rowVals = Array.from(new Set(data.map((r) => String(r[rowDim] ?? "")))).slice(0, 16);
    const colVals = Array.from(new Set(data.map((r) => String(r[colDim] ?? "")))).slice(0, 16);
    const lookup = new Map<string, number>();
    for (const r of data) lookup.set(`${r[rowDim]}|${r[colDim]}`, toNumber(r[metric]));
    const max = Math.max(...Array.from(lookup.values()), 1);

    return (
      <div className="overflow-x-auto p-4">
        <table className="border-separate" style={{ borderSpacing: 3 }}>
          <thead>
            <tr>
              <th />
              {colVals.map((c) => (
                <th key={c} className="px-1 pb-1 text-[10px] font-normal text-ink-dim">{c.length > 10 ? `${c.slice(0, 9)}…` : c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowVals.map((rv) => (
              <tr key={rv}>
                <td className="pr-2 text-right text-[11px] text-ink-secondary">{rv.length > 16 ? `${rv.slice(0, 15)}…` : rv}</td>
                {colVals.map((cv) => {
                  const v = lookup.get(`${rv}|${cv}`) ?? 0;
                  return (
                    <td key={cv}>
                      <div
                        title={`${rv} · ${cv}: ${fmt(v)}`}
                        className="flex h-9 w-12 items-center justify-center rounded-md text-[10px] tabular-nums text-ink transition-transform hover:scale-105"
                        style={{ backgroundColor: shade(v / max) }}
                      >
                        {v ? compact(v) : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Single-series intensity grid.
  const rows = [...data].sort((a, b) => toNumber(b[metric]) - toNumber(a[metric])).slice(0, 48);
  const max = Math.max(...rows.map((r) => toNumber(r[metric])), 1);
  return (
    <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((row, i) => {
        const v = toNumber(row[metric]);
        return (
          <div
            key={i}
            title={`${fmt(row[rowDim])}: ${fmt(v)}`}
            className="flex flex-col gap-1 rounded-lg p-3 transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: shade(v / max) }}
          >
            <span className="truncate text-[11px] text-ink-secondary">{fmt(row[rowDim])}</span>
            <span className="text-sm font-semibold tabular-nums text-ink">{fmt(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Donut (interactive, with hover→legend connector) ─────────────────────── */

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  const [x0o, y0o] = polar(cx, cy, rOuter, a1);
  const [x1o, y1o] = polar(cx, cy, rOuter, a0);
  const [x1i, y1i] = polar(cx, cy, rInner, a0);
  const [x0i, y0i] = polar(cx, cy, rInner, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0o},${y0o} A${rOuter},${rOuter} 0 ${large} 0 ${x1o},${y1o} L${x1i},${y1i} A${rInner},${rInner} 0 ${large} 1 ${x0i},${y0i} Z`;
}

function DonutView({ spec, data }: { spec: VizSpec; data: ResultRow[] }) {
  const label = spec.label!;
  const metric = spec.metric!;
  const [hover, setHover] = useState<number | null>(null);

  const slices = useMemo(() => {
    const sorted = [...data].sort((a, b) => toNumber(b[metric]) - toNumber(a[metric]));
    const TOP = 8;
    const out = sorted.slice(0, TOP).map((r) => ({ name: String(r[label] ?? ""), value: toNumber(r[metric]) }));
    if (sorted.length > TOP) {
      const rest = sorted.slice(TOP).reduce((s, r) => s + toNumber(r[metric]), 0);
      if (rest > 0) out.push({ name: `${sorted.length - TOP} others`, value: rest });
    }
    return out;
  }, [data, label, metric]);

  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const colors = seriesColors(slices.length);

  // fixed geometry so the SVG connector can line up with the HTML legend rows
  const D = 220;
  const c = D / 2;
  const outerR = 88;
  const innerR = 56;
  const gap = 28; // matches the sm:gap-7 flex gap below
  const rowH = Math.max(24, Math.min(34, Math.floor((D - 8) / slices.length)));
  // legend dot sits at: donut width + flex gap + ul padding-left(8) + half dot(5)
  const dotX = D + gap + 13;
  const overlayW = dotX + 10;
  const overlayH = Math.max(D, slices.length * rowH);

  let acc = 0;
  const arcs = slices.map((s, i) => {
    const a0 = (acc / total) * 360;
    acc += s.value;
    const a1 = (acc / total) * 360;
    return { ...s, i, a0, a1, mid: (a0 + a1) / 2 };
  });

  const hoveredName = hover !== null ? slices[hover].name : null;
  const hoveredPct = hover !== null ? ((slices[hover].value / total) * 100).toFixed(1) : null;

  return (
    <div className="p-4">
      <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-7" style={{ minHeight: overlayH }}>
        {/* donut */}
        <svg width={D} height={D} className="shrink-0" style={{ overflow: "visible" }}>
          {arcs.map((a) => {
            const isHover = hover === a.i;
            const [ux, uy] = polar(0, 0, 1, a.mid);
            return (
              <path
                key={a.i}
                d={arcPath(c, c, outerR, innerR, a.a0, Math.max(a.a1, a.a0 + 0.5))}
                fill={colors[a.i]}
                opacity={hover === null || isHover ? 1 : 0.4}
                transform={isHover ? `translate(${ux * 6}, ${uy * 6})` : undefined}
                style={{ transition: "opacity 150ms, transform 150ms", cursor: "pointer" }}
                onMouseEnter={() => setHover(a.i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
          {/* center label */}
          <text x={c} y={c - 4} textAnchor="middle" fill="currentColor" className="text-ink" style={{ fontSize: 20, fontWeight: 700 }}>
            {hoveredPct ? `${hoveredPct}%` : slices.length}
          </text>
          <text x={c} y={c + 16} textAnchor="middle" fill="currentColor" className="text-ink-dim" style={{ fontSize: 11 }}>
            {hoveredName ? (hoveredName.length > 16 ? `${hoveredName.slice(0, 15)}…` : hoveredName) : "categories"}
          </text>
        </svg>

        {/* connector overlay (desktop only) */}
        {hover !== null && (
          <svg
            className="pointer-events-none absolute left-0 top-0 hidden sm:block"
            width={overlayW}
            height={overlayH}
            style={{ overflow: "visible" }}
          >
            {(() => {
              const [sx, sy] = polar(c, c, outerR + 8, arcs[hover].mid);
              const ey = hover * rowH + rowH / 2;
              const midX = (sx + dotX) / 2;
              return (
                <path
                  d={`M${sx},${sy} C${midX},${sy} ${midX},${ey} ${dotX},${ey}`}
                  fill="none"
                  stroke={colors[hover]}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              );
            })()}
          </svg>
        )}

        {/* legend */}
        <ul className="flex w-full flex-col sm:flex-1">
          {slices.map((s, i) => {
            const pct = ((s.value / total) * 100).toFixed(1);
            const active = hover === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-2 text-left transition-colors ${active ? "bg-elevated/60" : ""}`}
                  style={{ height: rowH }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[i], boxShadow: active ? `0 0 0 3px ${tint(colors[i], 0.25)}` : undefined }} />
                    <span className={`truncate text-[13px] ${active ? "text-ink" : "text-ink-secondary"}`}>{s.name}</span>
                  </span>
                  <span className={`shrink-0 text-[13px] font-semibold tabular-nums ${active ? "text-ink" : "text-ink-secondary"}`}>{pct}%</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
