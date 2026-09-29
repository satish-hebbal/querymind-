"use client";

import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { useId, useMemo, useState, type MouseEvent } from "react";
import { inr, useCountUp, useEntered } from "@/components/landing/motion";

/*
 * Mini, self-contained versions of the layouts Datagini's generative UI could
 * render (see lib/viz-spec.ts). Each one animates in on mount and responds to
 * hover, so the landing page shows how the real results felt to use.
 */

const ACCENT = "rgb(var(--accent-green))";
const ACCENT_SOFT = "rgb(var(--accent-green) / 0.45)";
const AMBER = "#fbbf24";
export const CATEGORICAL = [ACCENT, "#2dd4bf", "#38bdf8", AMBER, "rgb(var(--text-tertiary))"];

const EASE = "var(--ease-out-expo)";

function Tooltip({ children, left, top }: { children: React.ReactNode; left: string; top: string }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-[11px] text-ink shadow-glow-md"
      style={{ left, top }}
    >
      {children}
    </div>
  );
}

/* ── Leaderboard ─────────────────────────────────────────────────────────── */

const PRODUCTS = [
  { label: "Aurora desk lamp", value: 482000 },
  { label: "Nimbus ergonomic chair", value: 395000 },
  { label: "Loop mechanical keyboard", value: 311000 },
  { label: "Drift standing desk", value: 227000 },
  { label: "Halo monitor arm", value: 184000 },
];

export function LeaderboardView() {
  const entered = useEntered();
  const [hover, setHover] = useState<number | null>(null);
  const max = PRODUCTS[0].value;

  return (
    <div className="space-y-1">
      {PRODUCTS.map((p, i) => {
        const active = hover === i || (hover === null && i === 0);
        return (
          <div
            key={p.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`flex cursor-default items-center gap-3 rounded-lg px-2.5 py-2 transition-colors duration-200 ${
              hover === i ? "bg-elevated" : ""
            }`}
          >
            <span className={`w-5 font-mono text-xs ${active ? "text-accent" : "text-ink-dim"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate text-ink">{p.label}</span>
                <span className="font-mono text-ink-secondary">{inr(p.value)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: entered ? `${(p.value / max) * 100}%` : "0%",
                    background: active ? ACCENT : ACCENT_SOFT,
                    transition: `width 1000ms ${EASE} ${i * 90}ms, background 200ms ease`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Bar ─────────────────────────────────────────────────────────────────── */

const MONTHLY_ORDERS = [
  { label: "Jan", value: 820 },
  { label: "Feb", value: 910 },
  { label: "Mar", value: 1040 },
  { label: "Apr", value: 980 },
  { label: "May", value: 1190 },
  { label: "Jun", value: 1284 },
  { label: "Jul", value: 1350 },
  { label: "Aug", value: 1502 },
];

export function BarView() {
  const entered = useEntered();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...MONTHLY_ORDERS.map((d) => d.value)) * 1.08;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
        {[0, 1, 2, 3].map((g) => (
          <div key={g} className="border-t border-dashed border-border/70" />
        ))}
      </div>
      <div className="relative flex h-48 items-end gap-2 sm:gap-3">
        {MONTHLY_ORDERS.map((d, i) => (
          <div
            key={d.label}
            className="relative flex h-full flex-1 cursor-default flex-col items-center justify-end gap-2"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="relative flex w-full flex-1 items-end">
              {hover === i && (
                <Tooltip left="50%" top={`${100 - (d.value / max) * 100}%`}>
                  <span className="font-mono">{d.value.toLocaleString("en-IN")}</span>{" "}
                  <span className="text-ink-tertiary">orders</span>
                </Tooltip>
              )}
              <div
                className="w-full rounded-t-md"
                style={{
                  height: entered ? `${(d.value / max) * 100}%` : "0%",
                  background: hover === null || hover === i ? ACCENT : ACCENT_SOFT,
                  opacity: hover === null ? 0.75 : hover === i ? 1 : 0.5,
                  transition: `height 900ms ${EASE} ${i * 60}ms, opacity 200ms ease, background 200ms ease`,
                }}
              />
            </div>
            <span className={`text-[10px] ${hover === i ? "text-ink" : "text-ink-dim"}`}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Line / Area ─────────────────────────────────────────────────────────── */

function TrendChart({
  values,
  labels,
  fill,
  format,
}: {
  values: number[];
  labels: string[];
  fill?: boolean;
  format: (v: number) => string;
}) {
  const entered = useEntered();
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = `trend-${useId().replace(/:/g, "")}`;

  const W = 400;
  const H = 170;
  const pad = { t: 14, r: 10, b: 24, l: 10 };
  const max = Math.max(...values) * 1.08;
  const min = Math.min(...values) * 0.85;
  const step = (W - pad.l - pad.r) / (values.length - 1);
  const x = (i: number) => pad.l + i * step;
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  const tickEvery = Math.ceil(values.length / 6);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    setHover(Math.max(0, Math.min(values.length - 1, Math.round((px - pad.l) / step))));
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full cursor-crosshair overflow-visible"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.35" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((g) => {
          const gy = pad.t + (g / 3) * (H - pad.t - pad.b);
          return (
            <line key={g} x1={pad.l} x2={W - pad.r} y1={gy} y2={gy} strokeDasharray="3 4" className="stroke-border" />
          );
        })}

        {fill && (
          <path
            d={area}
            fill={`url(#${gradientId})`}
            style={{ opacity: entered ? 1 : 0, transition: "opacity 900ms ease 600ms" }}
          />
        )}

        <path
          d={line}
          fill="none"
          stroke={ACCENT}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: entered ? 0 : 1,
            transition: `stroke-dashoffset 1600ms ${EASE}`,
          }}
        />

        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.t}
              y2={H - pad.b}
              className="stroke-border-bright"
              strokeDasharray="2 3"
            />
            <circle cx={x(hover)} cy={y(values[hover])} r="7" fill={ACCENT} opacity="0.2" />
            <circle cx={x(hover)} cy={y(values[hover])} r="3.5" fill={ACCENT} />
          </g>
        )}
      </svg>

      {/* Axis labels live in HTML so they stay 10px however wide the chart is. */}
      <div className="relative -mt-3 h-4">
        {labels.map((label, i) =>
          i % tickEvery === 0 ? (
            <span
              key={label}
              className={`absolute -translate-x-1/2 text-[10px] ${hover === i ? "text-ink" : "text-ink-dim"}`}
              style={{ left: `${(x(i) / W) * 100}%` }}
            >
              {label}
            </span>
          ) : null,
        )}
      </div>

      {hover !== null && (
        <Tooltip left={`${(x(hover) / W) * 100}%`} top={`${(y(values[hover]) / H) * 100}%`}>
          <span className="text-ink-tertiary">{labels[hover]}</span>{" "}
          <span className="font-mono">{format(values[hover])}</span>
        </Tooltip>
      )}
    </div>
  );
}

const DAU = Array.from({ length: 30 }, (_, i) => {
  const weekend = i % 7 === 5 || i % 7 === 6 ? -170 : 0;
  return Math.round(1180 + i * 19 + Math.sin(i * 0.9) * 80 + weekend);
});
const DAU_LABELS = Array.from({ length: 30 }, (_, i) => `Sep ${i + 1}`);

export function LineView() {
  return <TrendChart values={DAU} labels={DAU_LABELS} format={(v) => `${v.toLocaleString("en-IN")} users`} />;
}

const WEEKLY_REVENUE = [21, 24, 23, 27, 30, 29, 34, 38, 36, 42, 47, 52].map((v) => v * 100000);
const WEEK_LABELS = WEEKLY_REVENUE.map((_, i) => `W${i + 1}`);

export function AreaView() {
  return <TrendChart values={WEEKLY_REVENUE} labels={WEEK_LABELS} fill format={inr} />;
}

/* ── Pie / Donut ─────────────────────────────────────────────────────────── */

const PLANS = [
  { label: "Pro", value: 4542 },
  { label: "Starter", value: 1767 },
  { label: "Free", value: 1262 },
  { label: "Enterprise", value: 841 },
];

export function DonutView() {
  const entered = useEntered();
  const [hover, setHover] = useState<number | null>(null);
  const total = PLANS.reduce((s, p) => s + p.value, 0);
  const r = 58;
  const c = 2 * Math.PI * r;
  const gap = 3;

  let cumulative = 0;
  const segments = PLANS.map((p, i) => {
    const len = (p.value / total) * c;
    const start = cumulative;
    cumulative += len;
    return { ...p, len, start, color: CATEGORICAL[i] };
  });

  const focus = hover !== null ? segments[hover] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" strokeWidth="16" className="stroke-elevated" />
          {segments.map((s, i) => (
            <circle
              key={s.label}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === i ? 22 : 16}
              strokeDasharray={`${entered ? Math.max(0, s.len - gap) : 0} ${c}`}
              strokeDashoffset={-s.start}
              opacity={hover === null || hover === i ? 1 : 0.35}
              className="cursor-pointer"
              style={{
                transition: `stroke-dasharray 1000ms ${EASE} ${i * 140}ms, stroke-width 200ms ease, opacity 200ms ease`,
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span key={focus?.label ?? "total"} className="rise-in font-mono text-xl font-semibold text-ink">
            {focus ? `${Math.round((focus.value / total) * 100)}%` : total.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-ink-tertiary">{focus ? focus.label : "customers"}</span>
        </div>
      </div>

      <div className="grid w-full max-w-[220px] gap-1 text-xs">
        {segments.map((s, i) => (
          <div
            key={s.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors ${
              hover === i ? "bg-elevated" : ""
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 text-ink-secondary">{s.label}</span>
            <span className="font-mono text-ink">{s.value.toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Breakdown ───────────────────────────────────────────────────────────── */

const SOURCES = [
  { label: "Organic search", pct: 38, sessions: 41820 },
  { label: "Direct", pct: 24, sessions: 26410 },
  { label: "Referral", pct: 17, sessions: 18710 },
  { label: "Paid social", pct: 13, sessions: 14300 },
  { label: "Email", pct: 8, sessions: 8800 },
];

export function BreakdownView() {
  const entered = useEntered();
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div>
      <div className="flex h-4 w-full gap-1 overflow-hidden rounded-full">
        {SOURCES.map((s, i) => (
          <div
            key={s.label}
            className="h-full cursor-pointer first:rounded-l-full last:rounded-r-full"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{
              width: entered ? `${s.pct}%` : "0%",
              background: CATEGORICAL[i],
              opacity: hover === null || hover === i ? 1 : 0.3,
              transition: `width 1000ms ${EASE} ${i * 110}ms, opacity 200ms ease`,
            }}
          />
        ))}
      </div>

      <div className="mt-5 space-y-1">
        {SOURCES.map((s, i) => (
          <div
            key={s.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`grid cursor-default grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-md px-2 py-1.5 text-xs transition-colors ${
              hover === i ? "bg-elevated" : ""
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORICAL[i] }} />
            <span className="text-ink-secondary">{s.label}</span>
            <span className="font-mono text-ink-dim">{s.sessions.toLocaleString("en-IN")}</span>
            <span className="w-10 text-right font-mono font-medium text-ink">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Stacked ─────────────────────────────────────────────────────────────── */

const STACK_SERIES = ["Pro", "Starter", "Enterprise"];
const REGIONS = [
  { label: "South", values: [18, 9, 14] },
  { label: "West", values: [16, 11, 9] },
  { label: "North", values: [12, 8, 7] },
  { label: "East", values: [9, 6, 4] },
  { label: "Central", values: [6, 5, 2] },
];

export function StackedView() {
  const entered = useEntered();
  const [hover, setHover] = useState<number | null>(null);
  const maxTotal = Math.max(...REGIONS.map((r) => r.values.reduce((a, b) => a + b, 0))) * 1.08;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-ink-tertiary">
        {STACK_SERIES.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: CATEGORICAL[i] }} />
            {s}
          </span>
        ))}
      </div>
      <div className="flex h-44 items-end gap-3 sm:gap-5">
        {REGIONS.map((r, i) => {
          const total = r.values.reduce((a, b) => a + b, 0);
          return (
            <div
              key={r.label}
              className="relative flex h-full flex-1 cursor-default flex-col items-center justify-end gap-2"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="relative flex w-full flex-1 items-end">
                {hover === i && (
                  <Tooltip left="50%" top={`${100 - (total / maxTotal) * 100}%`}>
                    <span className="font-mono">₹{total}L</span>
                    <span className="text-ink-tertiary"> · {r.values.map((v) => `${v}L`).join(" / ")}</span>
                  </Tooltip>
                )}
                <div
                  className="flex w-full flex-col-reverse gap-[2px] overflow-hidden rounded-t-md"
                  style={{
                    height: entered ? `${(total / maxTotal) * 100}%` : "0%",
                    opacity: hover === null || hover === i ? 1 : 0.45,
                    transition: `height 1000ms ${EASE} ${i * 80}ms, opacity 200ms ease`,
                  }}
                >
                  {r.values.map((v, s) => (
                    <div key={s} style={{ flexGrow: v, background: CATEGORICAL[s] }} />
                  ))}
                </div>
              </div>
              <span className={`text-[10px] ${hover === i ? "text-ink" : "text-ink-dim"}`}>{r.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Bullet ──────────────────────────────────────────────────────────────── */

const REPS = [
  { label: "Meera", value: 65.5, target: 50 },
  { label: "Ananya", value: 56, target: 50 },
  { label: "Ishaan", value: 41.6, target: 40 },
  { label: "Rohan", value: 43.2, target: 45 },
  { label: "Kabir", value: 31.2, target: 40 },
];

export function BulletView() {
  const entered = useEntered();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...REPS.flatMap((r) => [r.value, r.target])) * 1.1;

  return (
    <div className="space-y-3">
      {REPS.map((r, i) => {
        const pct = Math.round((r.value / r.target) * 100);
        const hit = pct >= 100;
        return (
          <div
            key={r.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="grid cursor-default grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-xs"
          >
            <span className={hover === i ? "text-ink" : "text-ink-secondary"}>{r.label}</span>
            <div className="relative h-5 rounded-md bg-elevated">
              <div
                className="absolute inset-y-1 left-0 rounded-sm"
                style={{
                  width: entered ? `${(r.value / max) * 100}%` : "0%",
                  background: hit ? ACCENT : AMBER,
                  opacity: hover === null || hover === i ? 0.9 : 0.4,
                  transition: `width 1000ms ${EASE} ${i * 90}ms, opacity 200ms ease`,
                }}
              />
              <div
                className="absolute -inset-y-0.5 w-0.5 rounded-full bg-ink"
                style={{ left: `${(r.target / max) * 100}%` }}
              />
              {hover === i && (
                <span className="rise-in absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink">
                  ₹{r.value}L of ₹{r.target}L
                </span>
              )}
            </div>
            <span className={`text-right font-mono font-medium ${hit ? "text-accent" : "text-[#fbbf24]"}`}>{pct}%</span>
          </div>
        );
      })}
      <p className="flex items-center gap-2 pt-1 text-[11px] text-ink-dim">
        <span className="inline-block h-3 w-0.5 rounded-full bg-ink" /> quarterly target
      </p>
    </div>
  );
}

/* ── Heatmap ─────────────────────────────────────────────────────────────── */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [8, 10, 12, 14, 16, 18, 20, 22];

export function HeatmapView() {
  const entered = useEntered();
  const [hover, setHover] = useState<[number, number] | null>(null);

  const grid = useMemo(() => {
    const raw = DAYS.map((_, d) =>
      HOURS.map((h) => {
        const lunch = Math.exp(-((h - 13) ** 2) / 8);
        const evening = Math.exp(-((h - 20) ** 2) / 6) * (d >= 4 ? 1.25 : 0.8);
        return (d < 5 ? 1 : 0.8) * (0.2 + 0.6 * lunch + 0.8 * evening);
      }),
    );
    const max = Math.max(...raw.flat());
    return raw.map((row) => row.map((v) => v / max));
  }, []);

  const orders = (v: number) => Math.round(v * 214);

  return (
    <div>
      <div className="grid grid-cols-[2.25rem_repeat(8,minmax(0,1fr))] gap-1">
        <span />
        {HOURS.map((h) => (
          <span key={h} className="pb-1 text-center text-[10px] text-ink-dim">
            {String(h).padStart(2, "0")}
          </span>
        ))}
        {grid.map((row, d) => (
          <div key={DAYS[d]} className="contents">
            <span className={`self-center text-[10px] ${hover?.[0] === d ? "text-ink" : "text-ink-dim"}`}>
              {DAYS[d]}
            </span>
            {row.map((v, h) => {
              const isHover = hover?.[0] === d && hover?.[1] === h;
              return (
                <div
                  key={h}
                  onMouseEnter={() => setHover([d, h])}
                  onMouseLeave={() => setHover(null)}
                  className={`h-6 cursor-pointer rounded-[5px] sm:h-7 ${isHover ? "ring-2 ring-ink" : ""}`}
                  style={{
                    background: `rgb(var(--accent-green) / ${0.08 + v * 0.85})`,
                    opacity: entered ? 1 : 0,
                    transform: entered ? "scale(1)" : "scale(0.4)",
                    transition: `opacity 500ms ease ${(d + h) * 35}ms, transform 600ms ${EASE} ${(d + h) * 35}ms`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px]">
        <span key={hover ? hover.join("-") : "none"} className="rise-in text-ink-secondary">
          {hover ? (
            <>
              {DAYS[hover[0]]} · {String(HOURS[hover[1]]).padStart(2, "0")}:00 ·{" "}
              <span className="font-mono text-ink">{orders(grid[hover[0]][hover[1]])}</span> orders
            </>
          ) : (
            <span className="text-ink-dim">Hover a cell</span>
          )}
        </span>
        <span className="flex items-center gap-1.5 text-ink-dim">
          less
          {[0.1, 0.3, 0.55, 0.8, 0.95].map((a) => (
            <span key={a} className="h-2.5 w-2.5 rounded-sm" style={{ background: `rgb(var(--accent-green) / ${a})` }} />
          ))}
          more
        </span>
      </div>
    </div>
  );
}

/* ── Comparison ──────────────────────────────────────────────────────────── */

const COMPARISONS = [
  { label: "Revenue", now: 4820000, prev: 3950000, format: inr },
  { label: "Orders", now: 1284, prev: 1190, format: (v: number) => Math.round(v).toLocaleString("en-IN") },
  { label: "Avg order value", now: 3754, prev: 3319, format: (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}` },
];

function ComparisonCard({ item, index }: { item: (typeof COMPARISONS)[number]; index: number }) {
  const entered = useEntered();
  const value = useCountUp(item.now, entered, 1200);
  const delta = ((item.now - item.prev) / item.prev) * 100;
  const max = Math.max(item.now, item.prev);

  return (
    <div
      className="rise-in rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-bright"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <p className="text-[11px] text-ink-tertiary">{item.label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-ink">{item.format(value)}</p>
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-medium text-accent">
        <ArrowUp size={10} strokeWidth={2.5} />
        {delta.toFixed(1)}%
      </span>
      <div className="mt-4 space-y-1.5">
        {[
          { tag: "This month", v: item.now, color: ACCENT },
          { tag: "Last month", v: item.prev, color: "rgb(var(--text-dim))" },
        ].map((b) => (
          <div key={b.tag} className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full rounded-full"
                style={{
                  width: entered ? `${(b.v / max) * 100}%` : "0%",
                  background: b.color,
                  transition: `width 1100ms ${EASE} ${index * 120 + 200}ms`,
                }}
              />
            </div>
            <span className="w-16 text-[10px] text-ink-dim">{b.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComparisonView() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {COMPARISONS.map((item, i) => (
        <ComparisonCard key={item.label} item={item} index={i} />
      ))}
    </div>
  );
}

/* ── Cards ───────────────────────────────────────────────────────────────── */

const ACCOUNTS = [
  { name: "Northwind Labs", city: "Bengaluru", seats: 120, mrr: 184000, since: "Sep 21" },
  { name: "Kestrel Health", city: "Mumbai", seats: 85, mrr: 142000, since: "Sep 18" },
  { name: "Tidewater Logistics", city: "Chennai", seats: 64, mrr: 96000, since: "Sep 12" },
  { name: "Orbital Foods", city: "Pune", seats: 40, mrr: 71000, since: "Sep 04" },
];

export function CardsView() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ACCOUNTS.map((a, i) => (
        <div
          key={a.name}
          className="rise-in group cursor-default rounded-xl border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-1 hover:border-border-bright hover:shadow-glow-md"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted font-mono text-sm font-semibold text-accent">
              {a.name[0]}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{a.name}</p>
              <p className="text-[11px] text-ink-tertiary">
                {a.city} · since {a.since}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] text-ink-dim">MRR</p>
              <p className="font-mono text-sm text-ink">{inr(a.mrr)}</p>
            </div>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-ink-secondary transition-colors group-hover:border-accent/50 group-hover:text-accent">
              {a.seats} seats
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── KPI ─────────────────────────────────────────────────────────────────── */

const KPIS = [
  { label: "Revenue (YTD)", value: 12400000, format: inr, delta: "+18.2%", spark: [4, 5, 5, 6, 7, 7, 9, 10] },
  {
    label: "Customers",
    value: 8412,
    format: (v: number) => Math.round(v).toLocaleString("en-IN"),
    delta: "+6.4%",
    spark: [6, 6, 7, 7, 8, 8, 9, 9],
  },
  {
    label: "Orders",
    value: 23905,
    format: (v: number) => Math.round(v).toLocaleString("en-IN"),
    delta: "+11.0%",
    spark: [3, 5, 4, 6, 7, 6, 8, 9],
  },
  { label: "Monthly churn", value: 2.1, format: (v: number) => `${v.toFixed(1)}%`, delta: "-0.4pt", spark: [9, 8, 8, 6, 6, 5, 4, 4] },
];

function KpiTile({ kpi, index }: { kpi: (typeof KPIS)[number]; index: number }) {
  const entered = useEntered();
  const value = useCountUp(kpi.value, entered, 1300);
  const max = Math.max(...kpi.spark);
  const points = kpi.spark.map((v, i) => `${(i / (kpi.spark.length - 1)) * 100},${28 - (v / max) * 24}`).join(" ");

  return (
    <div
      className="rise-in rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-bright"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <p className="text-[11px] text-ink-tertiary">{kpi.label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-ink">{kpi.format(value)}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="text-[11px] font-medium text-accent">{kpi.delta}</span>
        <svg viewBox="0 0 100 30" className="h-7 w-20 overflow-visible" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke={ACCENT}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ opacity: entered ? 1 : 0, transition: `opacity 800ms ease ${index * 100 + 400}ms` }}
          />
        </svg>
      </div>
    </div>
  );
}

export function KpiView() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {KPIS.map((kpi, i) => (
        <KpiTile key={kpi.label} kpi={kpi} index={i} />
      ))}
    </div>
  );
}

/* ── Table ───────────────────────────────────────────────────────────────── */

const ORDERS = [
  { id: "#10482", customer: "Aarav Shah", city: "Bengaluru", amount: 12450, status: "Paid" },
  { id: "#10481", customer: "Diya Menon", city: "Kochi", amount: 3890, status: "Paid" },
  { id: "#10480", customer: "Kabir Rao", city: "Hyderabad", amount: 27100, status: "Refunded" },
  { id: "#10479", customer: "Ira Kapoor", city: "Delhi", amount: 8640, status: "Paid" },
  { id: "#10478", customer: "Vihaan Iyer", city: "Chennai", amount: 15320, status: "Pending" },
  { id: "#10477", customer: "Saanvi Joshi", city: "Pune", amount: 5210, status: "Paid" },
];

type SortKey = "id" | "customer" | "amount";

export function TableView() {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "id", dir: -1 });

  const rows = useMemo(
    () =>
      [...ORDERS].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
      }),
    [sort],
  );

  const header = (key: SortKey, label: string, align = "") => (
    <button
      type="button"
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : -1 }))}
      className={`flex items-center gap-1 transition-colors hover:text-ink ${align} ${sort.key === key ? "text-ink" : ""}`}
    >
      {label}
      {sort.key === key ? (
        sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />
      ) : (
        <ChevronDown size={11} className="opacity-40" />
      )}
    </button>
  );

  const statusClass: Record<string, string> = {
    Paid: "bg-accent-muted text-accent",
    Pending: "bg-[#fbbf24]/15 text-[#fbbf24]",
    Refunded: "bg-elevated text-ink-tertiary",
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[440px] text-xs">
        <div className="grid grid-cols-[4.5rem_1fr_6rem_5.5rem_5rem] gap-3 border-b border-border px-2 pb-2 text-ink-tertiary">
          {header("id", "Order")}
          {header("customer", "Customer")}
          <span>City</span>
          {header("amount", "Amount", "justify-end")}
          <span className="text-right">Status</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={`${sort.key}-${sort.dir}-${r.id}`}
            className="rise-in grid grid-cols-[4.5rem_1fr_6rem_5.5rem_5rem] items-center gap-3 rounded-md border-b border-border/50 px-2 py-2 transition-colors last:border-b-0 hover:bg-elevated"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="font-mono text-ink-dim">{r.id}</span>
            <span className="truncate text-ink">{r.customer}</span>
            <span className="text-ink-secondary">{r.city}</span>
            <span className="text-right font-mono text-ink">₹{r.amount.toLocaleString("en-IN")}</span>
            <span className="text-right">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass[r.status]}`}>{r.status}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
