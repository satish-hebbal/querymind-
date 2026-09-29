"use client";

import {
  Braces,
  ChartArea,
  ChartColumn,
  ChartColumnStacked,
  ChartLine,
  ChartPie,
  Columns2,
  Gauge,
  Grid3x3,
  LayoutGrid,
  Percent,
  Table,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import { FORCED_VIZ_OPTIONS, type VizLayout } from "@/lib/viz-spec";
import { useInView } from "@/components/landing/motion";
import {
  AreaView,
  BarView,
  BreakdownView,
  BulletView,
  CardsView,
  ComparisonView,
  DonutView,
  HeatmapView,
  KpiView,
  LeaderboardView,
  LineView,
  StackedView,
  TableView,
} from "@/components/landing/viz-views";

interface Item {
  layout: VizLayout;
  icon: LucideIcon;
  question: string;
  spec: Record<string, string | number>;
  View: ComponentType;
}

const ITEMS: Item[] = [
  {
    layout: "leaderboard",
    icon: Trophy,
    question: "Which products earned the most this quarter?",
    spec: { layout: "leaderboard", label: "product", metric: "revenue", highlightTop: 1 },
    View: LeaderboardView,
  },
  {
    layout: "bar",
    icon: ChartColumn,
    question: "How many orders did we get each month?",
    spec: { layout: "bar", label: "month", metric: "orders" },
    View: BarView,
  },
  {
    layout: "line",
    icon: ChartLine,
    question: "How are daily active users trending?",
    spec: { layout: "line", label: "day", metric: "active_users" },
    View: LineView,
  },
  {
    layout: "area",
    icon: ChartArea,
    question: "Show weekly revenue for the last 12 weeks",
    spec: { layout: "area", label: "week", metric: "revenue" },
    View: AreaView,
  },
  {
    layout: "pie",
    icon: ChartPie,
    question: "What's our customer mix by plan?",
    spec: { layout: "pie", label: "plan", metric: "customers" },
    View: DonutView,
  },
  {
    layout: "breakdown",
    icon: Percent,
    question: "Where does our traffic come from?",
    spec: { layout: "breakdown", label: "source", metric: "sessions" },
    View: BreakdownView,
  },
  {
    layout: "stacked",
    icon: ChartColumnStacked,
    question: "Revenue by region, split by plan",
    spec: { layout: "stacked", label: "region", metric: "pro", secondary: "starter" },
    View: StackedView,
  },
  {
    layout: "bullet",
    icon: Target,
    question: "Is each rep hitting their quarterly target?",
    spec: { layout: "bullet", label: "rep", metric: "sales", secondary: "target" },
    View: BulletView,
  },
  {
    layout: "heatmap",
    icon: Grid3x3,
    question: "When do people place orders during the week?",
    spec: { layout: "heatmap", label: "weekday", secondary: "hour", metric: "orders" },
    View: HeatmapView,
  },
  {
    layout: "comparison",
    icon: Columns2,
    question: "How did this month compare to last month?",
    spec: { layout: "comparison", label: "metric", metric: "this_month", secondary: "last_month" },
    View: ComparisonView,
  },
  {
    layout: "cards",
    icon: LayoutGrid,
    question: "Show our newest enterprise accounts",
    spec: { layout: "cards", label: "company", metric: "mrr", sort: "desc" },
    View: CardsView,
  },
  {
    layout: "kpi",
    icon: Gauge,
    question: "Give me the business at a glance",
    spec: { layout: "kpi", title: "At a glance" },
    View: KpiView,
  },
  {
    layout: "table",
    icon: Table,
    question: "List the latest orders",
    spec: { layout: "table", sort: "desc" },
    View: TableView,
  },
];

const LABELS = new Map(FORCED_VIZ_OPTIONS.map((o) => [o.value, o]));
const CYCLE_MS = 5200;

function SpecLine({ spec }: { spec: Item["spec"] }) {
  const entries = Object.entries(spec);
  return (
    <code className="block overflow-x-auto whitespace-nowrap font-mono text-[11px] leading-relaxed">
      <span className="text-ink-dim">{"{ "}</span>
      {entries.map(([k, v], i) => (
        <span key={k} className="rise-in inline-block" style={{ animationDelay: `${i * 70}ms` }}>
          <span className="text-ink-tertiary">&quot;{k}&quot;</span>
          <span className="text-ink-dim">: </span>
          <span className={typeof v === "number" ? "text-[#fbbf24]" : "text-accent"}>
            {typeof v === "number" ? v : `"${v}"`}
          </span>
          {i < entries.length - 1 && <span className="text-ink-dim">, </span>}
        </span>
      ))}
      <span className="text-ink-dim">{" }"}</span>
    </code>
  );
}

export default function VizGallery() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.35, once: false });
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);

  const running = inView && auto && !paused;

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % ITEMS.length), CYCLE_MS);
    return () => clearTimeout(id);
  }, [running, active]);

  const item = ITEMS[active];
  const meta = LABELS.get(item.layout);
  const pick = (i: number) => {
    setActive(i);
    setAuto(false);
  };

  return (
    <div ref={ref} className="grid gap-6 lg:grid-cols-[15rem_1fr] lg:gap-8">
      {/* Layout picker */}
      <div className="mask-fade-x -mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0 lg:[mask-image:none]">
        <div className="flex gap-2 lg:flex-col lg:gap-0.5">
          {ITEMS.map((it, i) => {
            const Icon = it.icon;
            const isActive = i === active;
            return (
              <button
                key={it.layout}
                type="button"
                onClick={() => pick(i)}
                className={`relative flex shrink-0 items-center gap-2.5 overflow-hidden rounded-lg border px-3 py-2 text-left text-xs transition-all duration-200 lg:border-transparent ${
                  isActive
                    ? "border-border-bright bg-card text-ink lg:border-border"
                    : "border-border text-ink-tertiary hover:bg-surface hover:text-ink-secondary"
                }`}
              >
                <Icon size={14} strokeWidth={1.75} className={isActive ? "text-accent" : ""} />
                <span className="whitespace-nowrap">{LABELS.get(it.layout)?.label ?? it.layout}</span>
                {isActive && running && (
                  <span
                    key={active}
                    className="progress-fill absolute inset-x-0 bottom-0 h-px bg-accent"
                    style={{ "--progress-duration": `${CYCLE_MS}ms` } as CSSProperties}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage */}
      <div
        className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-glow-lg"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-5">
          <p key={`q-${active}`} className="rise-in truncate text-sm text-ink">
            <span className="mr-2 text-ink-dim">›</span>
            {item.question}
          </p>
          <span className="hidden shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[10px] text-ink-tertiary sm:inline">
            {meta?.hint}
          </span>
        </div>

        <div key={`v-${active}`} className="flex min-h-[300px] flex-1 flex-col justify-center p-4 sm:p-6">
          <item.View />
        </div>

        <div className="flex items-center gap-3 border-t border-border bg-surface/60 px-4 py-2.5 sm:px-5">
          <Braces size={13} className="shrink-0 text-ink-dim" />
          <div key={`s-${active}`} className="min-w-0 flex-1">
            <SpecLine spec={item.spec} />
          </div>
        </div>
      </div>
    </div>
  );
}
