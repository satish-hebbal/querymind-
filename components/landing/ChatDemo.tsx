"use client";

import { useEffect, useState } from "react";
import GiniMascot from "@/components/GiniMascot";

type BarDatum = { label: string; value: number };
type ComparisonDatum = { label: string; a: number; b: number };
type PieColor = "accent" | "ink-dim" | "accent-dim";
type PieDatum = { label: string; value: number; color: PieColor };
type TableRow = { name: string; orders: string; spent: string };

type Scenario =
  | { question: string; answer: string; sql: string; rows: number; view: "bar"; data: BarDatum[] }
  | {
      question: string;
      answer: string;
      sql: string;
      rows: number;
      view: "comparison";
      legend: [string, string];
      data: ComparisonDatum[];
    }
  | { question: string; answer: string; sql: string; rows: number; view: "pie"; data: PieDatum[] }
  | { question: string; answer: string; sql: string; rows: number; view: "table"; columns: string[]; data: TableRow[] };

const SCENARIOS: Scenario[] = [
  {
    question: "Show me total revenue by month",
    answer: "Revenue is up 22% over the last 6 months, with the sharpest jump in May.",
    sql: `SELECT date_trunc('month', created_at) AS month,
       SUM(amount) AS revenue
FROM orders
GROUP BY 1
ORDER BY 1;`,
    rows: 6,
    view: "bar",
    data: [
      { label: "Jan", value: 38 },
      { label: "Feb", value: 46 },
      { label: "Mar", value: 52 },
      { label: "Apr", value: 61 },
      { label: "May", value: 82 },
      { label: "Jun", value: 100 },
    ],
  },
  {
    question: "Compare signups vs churn by quarter",
    answer: "New signups have outpaced churn each quarter, with the gap widening in Q4.",
    sql: `SELECT quarter,
       SUM(signups) AS signups,
       SUM(churned) AS churned
FROM growth_metrics
GROUP BY 1;`,
    rows: 4,
    view: "comparison",
    legend: ["New signups", "Churned"],
    data: [
      { label: "Q1", a: 120, b: 40 },
      { label: "Q2", a: 145, b: 38 },
      { label: "Q3", a: 168, b: 52 },
      { label: "Q4", a: 210, b: 45 },
    ],
  },
  {
    question: "What's our customer mix by plan?",
    answer: "Most customers are on the Pro plan, with Enterprise growing the fastest.",
    sql: `SELECT plan,
       COUNT(*) AS customers
FROM customers
GROUP BY 1
ORDER BY 2 DESC;`,
    rows: 3,
    view: "pie",
    data: [
      { label: "Pro", value: 54, color: "accent" },
      { label: "Free", value: 31, color: "ink-dim" },
      { label: "Enterprise", value: 15, color: "accent-dim" },
    ],
  },
  {
    question: "Who are my top customers by spend?",
    answer: "Acme Corp leads by a wide margin, with Globex and Initech close behind.",
    sql: `SELECT name, SUM(amount) AS spent
FROM orders
GROUP BY name
ORDER BY 2 DESC
LIMIT 5;`,
    rows: 5,
    view: "table",
    columns: ["Customer", "Orders", "Total spent"],
    data: [
      { name: "Acme Corp", orders: "128", spent: "$48,200" },
      { name: "Globex Inc", orders: "94", spent: "$31,450" },
      { name: "Initech", orders: "76", spent: "$22,900" },
      { name: "Umbrella Co", orders: "61", spent: "$18,300" },
      { name: "Soylent LLC", orders: "53", spent: "$14,750" },
    ],
  },
];

const THINKING_PHRASES = ["Reading your schema...", "Writing SQL...", "Running query..."];

const PROVIDERS = [
  { name: "GPT-4o", icon: "/model-icons/openai-icon.svg" },
  { name: "Claude 3.5 Sonnet", icon: "/model-icons/claude-icon.svg" },
  { name: "Gemini 1.5 Pro", icon: "/model-icons/gemini-icon.svg" },
];

const PIE_DOT: Record<PieColor, string> = {
  accent: "bg-accent",
  "ink-dim": "bg-ink-dim",
  "accent-dim": "bg-accent-dim",
};

const PIE_STROKE: Record<PieColor, string> = {
  accent: "stroke-accent",
  "ink-dim": "stroke-ink-dim",
  "accent-dim": "stroke-accent-dim",
};

const TYPE_SPEED_MS = 35;
const MAX_QUESTION_LENGTH = Math.max(...SCENARIOS.map((s) => s.question.length));

const PHASES = [
  { name: "idle", duration: 600 },
  { name: "typing", duration: MAX_QUESTION_LENGTH * TYPE_SPEED_MS + 500 },
  { name: "thinking", duration: 1800 },
  { name: "answer", duration: 700 },
  { name: "result", duration: 1500 },
  { name: "sql", duration: 2400 },
  { name: "hold", duration: 1600 },
] as const;

const TOTAL_LOOP_MS = PHASES.reduce((sum, p) => sum + p.duration, 0);

function renderResult(scenario: Scenario, visible: boolean) {
  switch (scenario.view) {
    case "bar":
      return (
        <div className="flex h-full items-center">
          <div className="flex h-28 w-full items-end gap-3 sm:h-32">
            {scenario.data.map((bar, index) => (
              <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div
                  className="w-full rounded-t-md bg-accent/60 transition-all ease-out"
                  style={{
                    height: visible ? `${bar.value}%` : "0%",
                    transitionDuration: "500ms",
                    transitionDelay: `${index * 70}ms`,
                  }}
                />
                <span className="text-[10px] text-ink-dim">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "comparison": {
      const max = Math.max(...scenario.data.flatMap((d) => [d.a, d.b]));
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-4 pb-2 text-[10px] text-ink-dim">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent/60" />
              {scenario.legend[0]}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ink-dim/40" />
              {scenario.legend[1]}
            </span>
          </div>
          <div className="flex h-24 items-end gap-4 sm:h-28">
            {scenario.data.map((d, index) => (
              <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 rounded-t-md bg-accent/60 transition-all ease-out"
                    style={{
                      height: visible ? `${(d.a / max) * 100}%` : "0%",
                      transitionDuration: "500ms",
                      transitionDelay: `${index * 80}ms`,
                    }}
                  />
                  <div
                    className="w-1/2 rounded-t-md bg-ink-dim/40 transition-all ease-out"
                    style={{
                      height: visible ? `${(d.b / max) * 100}%` : "0%",
                      transitionDuration: "500ms",
                      transitionDelay: `${index * 80 + 40}ms`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-ink-dim">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "pie": {
      const total = scenario.data.reduce((sum, d) => sum + d.value, 0);
      const radius = 45;
      const circumference = 2 * Math.PI * radius;
      let cumulative = 0;
      const segments = scenario.data.map((d) => {
        const segLen = (d.value / total) * circumference;
        const offset = circumference - (cumulative / total) * circumference;
        cumulative += d.value;
        return { ...d, segLen, offset };
      });

      return (
        <div className="flex h-full items-center justify-center gap-6">
          <svg width="112" height="112" viewBox="0 0 120 120" className="-rotate-90 shrink-0">
            <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="14" className="stroke-border" />
            {segments.map((seg, index) => (
              <circle
                key={seg.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="14"
                strokeLinecap="butt"
                className={`${PIE_STROKE[seg.color]} transition-all ease-out`}
                style={{
                  strokeDasharray: visible ? `${seg.segLen} ${circumference}` : `0 ${circumference}`,
                  strokeDashoffset: seg.offset,
                  transitionDuration: "700ms",
                  transitionDelay: `${index * 150}ms`,
                }}
              />
            ))}
          </svg>
          <div className="flex flex-col gap-2 text-xs">
            {scenario.data.map((d) => (
              <div key={d.label} className="flex items-center gap-2 text-ink-secondary">
                <span className={`h-2.5 w-2.5 rounded-full ${PIE_DOT[d.color]}`} />
                <span>{d.label}</span>
                <span className="text-ink-dim">{Math.round((d.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "table":
      return (
        <div className="flex h-full flex-col text-xs">
          <div className="grid grid-cols-3 gap-2 border-b border-border pb-1.5 text-ink-tertiary">
            {scenario.columns.map((col, index) => (
              <span key={col} className={index === 0 ? "" : "text-right"}>
                {col}
              </span>
            ))}
          </div>
          {scenario.data.map((row, index) => (
            <div
              key={row.name}
              className="grid grid-cols-3 gap-2 border-b border-border/60 py-1 text-ink-secondary transition-all duration-300 ease-out last:border-b-0"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-8px)",
                transitionDelay: `${index * 80}ms`,
              }}
            >
              <span className="truncate text-ink">{row.name}</span>
              <span className="text-right">{row.orders}</span>
              <span className="text-right font-medium text-ink">{row.spent}</span>
            </div>
          ))}
        </div>
      );
  }
}

export default function ChatDemo() {
  const [phase, setPhase] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [startTime] = useState(() => Date.now());

  const loopIndex = Math.floor((Date.now() - startTime) / TOTAL_LOOP_MS);
  const scenario = SCENARIOS[loopIndex % SCENARIOS.length];
  const provider = PROVIDERS[loopIndex % PROVIDERS.length];

  useEffect(() => {
    const id = setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase].duration);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 0) setTypedChars(0);
  }, [phase]);

  useEffect(() => {
    if (PHASES[phase].name !== "typing" || typedChars >= scenario.question.length) return;
    const id = setTimeout(() => setTypedChars((c) => c + 1), TYPE_SPEED_MS);
    return () => clearTimeout(id);
  }, [phase, typedChars, scenario.question]);

  useEffect(() => {
    if (PHASES[phase].name !== "thinking") {
      setPhraseIndex(0);
      return;
    }
    const id = setInterval(() => setPhraseIndex((i) => (i + 1) % THINKING_PHRASES.length), 600);
    return () => clearInterval(id);
  }, [phase]);

  const userVisible = phase >= 1;
  const thinkingVisible = phase === 2;
  const answerVisible = phase >= 3;
  const resultVisible = phase >= 4;
  const sqlVisible = phase >= 5;
  const userText =
    PHASES[phase].name === "typing" ? scenario.question.slice(0, typedChars) : userVisible ? scenario.question : "";
  const showCursor = PHASES[phase].name === "typing" && typedChars < scenario.question.length;
  const isTable = scenario.view === "table";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-glow-md">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-dim/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-dim/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-dim/40" />
        </div>
        <span className="ml-2 truncate text-xs text-ink-tertiary">
          datagini.satishhebbal.design/project/acme-prod
        </span>
        <div
          key={loopIndex}
          className="page-fade ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-ink-tertiary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={provider.icon} alt="" className="h-3 w-3 opacity-80" />
          <span className="hidden sm:inline">{provider.name}</span>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-6">
        {/* User message */}
        <div
          className={`flex h-10 items-center justify-end overflow-hidden transition-all duration-500 ease-out ${
            userVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-elevated px-4 py-2.5 text-left text-sm text-ink">
            {userText}
            {showCursor && <span className="blink-cursor -mb-0.5 ml-0.5 inline-block h-3.5 w-[2px] bg-ink-tertiary" />}
          </div>
        </div>

        {/* Gini response */}
        <div
          className={`flex items-start gap-2.5 text-left transition-all duration-500 ease-out ${
            phase >= 2 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
            <GiniMascot size={28} typing={thinkingVisible} />
          </div>
          <div className="min-w-0 flex-1 pt-1 sm:max-w-[85%]">
            <div className="relative">
              {/* Thinking indicator, anchored next to the mascot */}
              <div
                className={`absolute inset-x-0 top-0 flex items-center gap-2 text-sm text-accent transition-opacity duration-300 ease-out ${
                  thinkingVisible ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: "200ms" }} />
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: "400ms" }} />
                </span>
                {THINKING_PHRASES[phraseIndex]}
              </div>

              <div className="space-y-3">
                {/* Answer */}
                <p
                  className={`h-12 overflow-hidden text-sm text-ink transition-all duration-500 ease-out ${
                    answerVisible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                  }`}
                >
                  {scenario.answer}
                </p>

                {/* Result: chart or table */}
                <div
                  className={`transition-opacity duration-500 ease-out ${
                    resultVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <span className="text-xs text-ink-secondary">{scenario.rows} rows</span>
                    <div className="flex gap-1 rounded-full border border-border bg-surface p-1 text-xs">
                      <span className={isTable ? "px-3 py-1 text-ink-secondary" : "rounded-full bg-ink px-3 py-1 text-bg"}>
                        Chart
                      </span>
                      <span className={isTable ? "rounded-full bg-ink px-3 py-1 text-bg" : "px-3 py-1 text-ink-secondary"}>
                        Table
                      </span>
                    </div>
                  </div>
                  <div className="h-44 rounded-lg border border-border bg-surface p-4">
                    {renderResult(scenario, resultVisible)}
                  </div>
                </div>

                {/* Generated SQL */}
                <div
                  className={`overflow-hidden rounded-lg border border-border bg-surface transition-opacity duration-500 ease-out ${
                    sqlVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="px-3 py-2 text-xs text-ink-secondary">Generated SQL</div>
                  <pre className="overflow-x-auto border-t border-border px-3 py-2 font-mono text-[12px] text-ink-secondary">
                    <code>{scenario.sql}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
