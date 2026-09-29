"use client";

import { Check, ChevronDown, CircleCheck, Database, KeyRound, LoaderCircle, Lock, Send, Sparkles, Wrench } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import GiniMascot from "@/components/GiniMascot";
import { inr, useEntered, useInView, usePhase, useTyped } from "@/components/landing/motion";

/*
 * "How it worked" as a pinned scroll story. One question travels through all
 * five stages, so the reader follows a single request from connection string
 * to rendered chart the way the real app handled it.
 */

const QUESTION = "Which cities drove the most revenue last quarter?";

const SQL = `SELECT c.city, SUM(o.amount) AS revenue
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= date_trunc('quarter', now()) - interval '3 months'
  AND o.created_at <  date_trunc('quarter', now())
GROUP BY c.city
ORDER BY revenue DESC
LIMIT 5;`;

const CITIES = [
  { city: "Bengaluru", revenue: 4820000 },
  { city: "Mumbai", revenue: 3950000 },
  { city: "Delhi", revenue: 3110000 },
  { city: "Pune", revenue: 2270000 },
  { city: "Hyderabad", revenue: 1840000 },
];

function StageFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-glow-lg">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink-dim/40" />
          <span className="h-2 w-2 rounded-full bg-ink-dim/40" />
          <span className="h-2 w-2 rounded-full bg-ink-dim/40" />
        </div>
        <span className="ml-1 font-mono text-[11px] text-ink-tertiary">{title}</span>
      </div>
      <div className="h-[360px] overflow-hidden p-5">{children}</div>
    </div>
  );
}

/* ── 1. Connect ──────────────────────────────────────────────────────────── */

const CONNECT_PHASES = [500, 2100, 1300, 3400] as const;

function ConnectStage({ active }: { active: boolean }) {
  const phase = usePhase(active, CONNECT_PHASES);
  const { typed, done } = useTyped("postgresql://analyst:••••••@db.acme.supabase.co:5432/postgres", active && phase >= 1, 26);

  return (
    <StageFrame title="dashboard / new project">
      <p className="text-sm font-medium text-ink">Connect a database</p>
      <p className="mt-1 text-xs text-ink-tertiary">Supabase, Neon, Railway, Render, or your own Postgres.</p>

      <label className="mt-5 block text-[11px] text-ink-secondary">Connection string</label>
      <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/db-icons/postgresql-icon.svg" alt="" className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">
          {typed || <span className="text-ink-dim">postgresql://user:password@host:5432/database</span>}
          {phase === 1 && !done && <span className="blink-cursor ml-px inline-block h-3 w-px bg-ink align-middle" />}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-300 ${
            phase === 3 ? "bg-accent-muted text-accent" : "border border-border text-ink-secondary"
          }`}
        >
          {phase === 2 && <LoaderCircle size={13} className="animate-spin" />}
          {phase === 3 && <Check size={13} strokeWidth={2.5} />}
          {phase === 2 ? "Testing connection" : phase === 3 ? "Connected" : "Test connection"}
        </span>
      </div>

      <div className={`mt-6 space-y-2.5 transition-opacity duration-500 ${phase === 3 ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="ping-ring absolute inset-0 rounded-full bg-accent" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="text-ink">acme-prod</span>
          <span className="text-ink-dim">PostgreSQL 15 · 6 tables</span>
        </div>
        <p className="flex items-center gap-2 text-[11px] text-ink-tertiary">
          <Lock size={12} /> The connection string is encrypted before it&apos;s stored.
        </p>
      </div>
    </StageFrame>
  );
}

/* ── 2. Schema ───────────────────────────────────────────────────────────── */

const SCHEMA_PHASES = [400, 2600, 3400] as const;

const TABLES = [
  { name: "customers", cols: 6 },
  { name: "orders", cols: 7 },
  { name: "order_items", cols: 5 },
  { name: "products", cols: 8 },
  { name: "payments", cols: 6 },
  { name: "sessions", cols: 4 },
];

const RELATIONS = ["orders.customer_id → customers.id", "order_items.order_id → orders.id", "order_items.product_id → products.id"];

function SchemaStage({ active }: { active: boolean }) {
  const phase = usePhase(active, SCHEMA_PHASES);
  const reading = phase === 1;

  return (
    <StageFrame title="project / acme-prod / schema">
      <div className="relative overflow-hidden rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[10.5px] leading-relaxed text-ink-secondary">
        <span className="text-accent">SELECT</span> table_name, column_name, data_type
        <br />
        <span className="text-accent">FROM</span> information_schema.columns
        {reading && <span className="shimmer absolute inset-x-0 bottom-0 h-0.5" />}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {TABLES.map((t, i) => (
          <div
            key={t.name}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 transition-all duration-500"
            style={{
              opacity: phase >= 1 ? 1 : 0,
              transform: phase >= 1 ? "none" : "translateY(6px)",
              transitionDelay: `${i * 220}ms`,
            }}
          >
            <Database size={12} className="shrink-0 text-ink-dim" />
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">{t.name}</span>
            <span className="text-[10px] text-ink-dim">{t.cols} cols</span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1.5">
        {RELATIONS.map((r, i) => (
          <p
            key={r}
            className="flex items-center gap-2 font-mono text-[10.5px] text-ink-tertiary transition-opacity duration-500"
            style={{ opacity: phase >= 1 ? 1 : 0, transitionDelay: `${1400 + i * 250}ms` }}
          >
            <KeyRound size={11} className="text-accent" /> {r}
          </p>
        ))}
      </div>

      <p
        className={`mt-5 flex items-center gap-2 text-xs transition-opacity duration-500 ${
          phase === 2 ? "text-accent opacity-100" : "opacity-0"
        }`}
      >
        <CircleCheck size={14} /> Schema context ready · 6 tables · 36 columns · 3 keys
      </p>
    </StageFrame>
  );
}

/* ── 3. Ask ──────────────────────────────────────────────────────────────── */

const ASK_PHASES = [400, 2300, 1700, 2800] as const;
const PICKER = ["Auto", "Leaderboard", "Bar chart", "Line chart", "Heatmap"];

function AskStage({ active }: { active: boolean }) {
  const phase = usePhase(active, ASK_PHASES);
  const { typed, done } = useTyped(QUESTION, active && phase >= 1, 34);
  const sent = phase === 3;

  return (
    <StageFrame title="project / acme-prod / chat">
      <div className="flex h-full flex-col">
        <div className="flex-1">
          {sent ? (
            <div className="rise-in flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-elevated px-4 py-2.5 text-sm text-ink">{QUESTION}</div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-6 text-ink-tertiary">
              <GiniMascot size={36} typing={phase === 1} />
              <p className="text-xs">Ask anything about acme-prod.</p>
            </div>
          )}
          {sent && (
            <div className="rise-in mt-4 flex items-center gap-2 text-xs text-accent" style={{ animationDelay: "300ms" }}>
              <GiniMascot size={24} typing />
              Reading your schema...
            </div>
          )}
        </div>

        <div className="relative rounded-xl border border-border bg-surface p-3">
          <p className="min-h-[2.5rem] text-sm text-ink">
            {sent ? (
              <span className="text-ink-dim">Ask a follow-up...</span>
            ) : (
              <>
                {typed || <span className="text-ink-dim">Ask a question about your data...</span>}
                {phase === 1 && !done && <span className="blink-cursor ml-px inline-block h-3.5 w-px bg-ink align-middle" />}
              </>
            )}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-ink-secondary">
              <Sparkles size={11} className="text-accent" /> Auto <ChevronDown size={11} />
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-ink-tertiary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/model-icons/meta-llama-icon.svg" alt="" className="h-3 w-3" /> Llama 3.3 70B
            </span>
            <span
              className={`ml-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 ${
                phase === 2 || sent ? "bg-accent text-bg" : "bg-elevated text-ink-dim"
              } ${sent ? "scale-90" : ""}`}
            >
              <Send size={13} />
            </span>
          </div>

          {phase === 2 && (
            <div className="rise-in absolute bottom-12 left-3 w-44 rounded-lg border border-border bg-card p-1 shadow-glow-md">
              {PICKER.map((p, i) => (
                <div
                  key={p}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] ${
                    i === 0 ? "bg-elevated text-ink" : "text-ink-tertiary"
                  }`}
                >
                  {p}
                  {i === 0 && <Check size={11} className="text-accent" />}
                </div>
              ))}
              <p className="px-2 pb-1 pt-1.5 text-[10px] text-ink-dim">+ 8 more layouts</p>
            </div>
          )}
        </div>
      </div>
    </StageFrame>
  );
}

/* ── 4. Agent ────────────────────────────────────────────────────────────── */

const AGENT_PHASES = [400, 1000, 1500, 1100, 1000, 3000] as const;

function AgentStage({ active }: { active: boolean }) {
  const phase = usePhase(active, AGENT_PHASES);

  const steps: { at: number; icon: ReactNode; title: ReactNode; body?: ReactNode }[] = [
    {
      at: 1,
      icon: <Sparkles size={12} />,
      title: (
        <>
          <span className="font-mono text-ink">sql_analyst</span> started
        </>
      ),
      body: <span className="text-ink-dim">Schema and question in context</span>,
    },
    {
      at: 2,
      icon: <Wrench size={12} />,
      title: (
        <>
          tool call · <span className="font-mono text-ink">run_sql</span>
        </>
      ),
      body: (
        <pre className="mt-1.5 overflow-hidden rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-[10px] leading-[1.55] text-ink-secondary">
          {SQL}
        </pre>
      ),
    },
    {
      at: 3,
      icon: <Database size={12} />,
      title: (
        <>
          5 rows · <span className="font-mono">38 ms</span>
        </>
      ),
      body: (
        <span className="font-mono text-[10px] text-ink-dim">
          Bengaluru 48.2L · Mumbai 39.5L · Delhi 31.1L · ...
        </span>
      ),
    },
    { at: 4, icon: <Check size={12} />, title: "Answer written, picking a layout" },
  ];

  return (
    <StageFrame title="agent trace">
      <div className="relative space-y-4 pl-6">
        <span className="absolute bottom-2 left-[9px] top-2 w-px bg-border" />
        {steps.map((s) => {
          const shown = phase >= s.at;
          const current = phase === s.at;
          return (
            <div
              key={s.at}
              className="relative transition-all duration-500"
              style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(6px)" }}
            >
              <span
                className={`absolute -left-6 top-0 flex h-[19px] w-[19px] items-center justify-center rounded-full border ${
                  current ? "border-accent bg-accent-muted text-accent" : "border-border bg-card text-ink-tertiary"
                }`}
              >
                {s.icon}
              </span>
              <p className="text-xs text-ink-secondary">{s.title}</p>
              {s.body && <div className="mt-0.5 text-[11px]">{s.body}</div>}
            </div>
          );
        })}
      </div>
    </StageFrame>
  );
}

/* ── 5. Render ───────────────────────────────────────────────────────────── */

const RENDER_PHASES = [400, 2000, 4200] as const;
const SPEC = `{ "layout": "leaderboard", "label": "city", "metric": "revenue", "highlightTop": 1 }`;

function CityBoard() {
  const entered = useEntered();
  const max = CITIES[0].revenue;
  return (
    <div className="space-y-2">
      {CITIES.map((c, i) => (
        <div key={c.city} className="flex items-center gap-3 text-xs">
          <span className={`w-4 font-mono ${i === 0 ? "text-accent" : "text-ink-dim"}`}>{i + 1}</span>
          <span className="w-20 text-ink">{c.city}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full"
              style={{
                width: entered ? `${(c.revenue / max) * 100}%` : "0%",
                background: i === 0 ? "rgb(var(--accent-green))" : "rgb(var(--accent-green) / 0.45)",
                transition: `width 1000ms var(--ease-out-expo) ${i * 110}ms`,
              }}
            />
          </div>
          <span className="w-12 text-right font-mono text-ink-secondary">{inr(c.revenue)}</span>
        </div>
      ))}
    </div>
  );
}

function RenderStage({ active }: { active: boolean }) {
  const phase = usePhase(active, RENDER_PHASES);
  const { typed } = useTyped(SPEC, active && phase >= 1, 18);

  return (
    <StageFrame title="generative ui">
      <p className="text-[11px] text-ink-dim">Model returns a tiny spec, not code</p>
      <pre className="mt-1.5 whitespace-pre-wrap break-all rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-[11px] leading-relaxed text-accent">
        {typed}
        {phase === 1 && <span className="blink-cursor ml-px inline-block h-3 w-px bg-accent align-middle" />}
      </pre>

      {phase === 2 && (
        <div className="rise-in mt-5 rounded-xl border border-border bg-surface/60 p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-ink">Revenue by city · last quarter</p>
            <span className="text-[10px] text-ink-dim">5 rows</span>
          </div>
          <CityBoard />
        </div>
      )}
      {phase === 2 && (
        <p className="rise-in mt-4 text-xs leading-relaxed text-ink-secondary" style={{ animationDelay: "500ms" }}>
          Bengaluru led last quarter with ₹48.2L, about 22% ahead of Mumbai.
        </p>
      )}
    </StageFrame>
  );
}

/* ── Story ───────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    title: "Connect your database",
    body: "Paste a Postgres connection string. Datagini tests it, encrypts it, and keeps it on your project. Nothing else to install.",
    Stage: ConnectStage,
  },
  {
    title: "It reads the schema",
    body: "Tables, columns, types and foreign keys come straight from information_schema, so the model knows what actually exists before it writes a line of SQL.",
    Stage: SchemaStage,
  },
  {
    title: "You ask in plain English",
    body: "Type the question the way you'd ask a teammate. Leave the layout on Auto, or force one of 13 visualizations from the picker.",
    Stage: AskStage,
  },
  {
    title: "An agent writes and runs the SQL",
    body: "A small SQL agent calls run_sql against your database, reads the rows it gets back, and writes a short answer in plain English.",
    Stage: AgentStage,
  },
  {
    title: "The answer renders itself",
    body: "Instead of slow, fragile generated code, the model returns a tiny JSON spec. Prebuilt, themed components turn it into an interactive chart in milliseconds.",
    Stage: RenderStage,
  },
];

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

function MobileStep({ index, step }: { index: number; step: (typeof STEPS)[number] }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4, once: false });
  const Stage = step.Stage;
  return (
    <div ref={ref} className="space-y-5">
      <StepText index={index} step={step} active />
      <Stage active={inView} />
    </div>
  );
}

function StepText({ index, step, active }: { index: number; step: (typeof STEPS)[number]; active: boolean }) {
  return (
    <div className={`transition-opacity duration-500 ${active ? "opacity-100" : "opacity-35"}`}>
      <p className="font-mono text-xs text-accent">[ 0{index + 1} ]</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{step.title}</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-tertiary sm:text-base">{step.body}</p>
    </div>
  );
}

export default function HowItWorks() {
  const desktop = useIsDesktop();
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!desktop) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [desktop]);

  if (!desktop) {
    return (
      <div className="space-y-20">
        {STEPS.map((step, i) => (
          <MobileStep key={step.title} index={i} step={step} />
        ))}
      </div>
    );
  }

  const ActiveStage = STEPS[active].Stage;

  return (
    <div className="grid grid-cols-2 gap-16">
      <div className="relative">
        <div className="absolute bottom-[35vh] left-0 top-[35vh] w-px bg-border">
          <div
            className="w-px bg-accent transition-all duration-700"
            style={{ height: `${((active + 1) / STEPS.length) * 100}%`, transitionTimingFunction: "var(--ease-out-expo)" }}
          />
        </div>
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            data-index={i}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            className="flex min-h-[70vh] items-center pl-10"
          >
            <StepText index={i} step={step} active={i === active} />
          </div>
        ))}
      </div>

      <div className="relative">
        <div className="sticky top-0 flex h-screen items-center">
          <div key={active} className="rise-in w-full">
            <ActiveStage active />
          </div>
        </div>
      </div>
    </div>
  );
}
