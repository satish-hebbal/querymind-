import { Archive, ArrowRight, Braces, Database, KeyRound, Lock, Sparkles, Wrench } from "lucide-react";
import localFont from "next/font/local";
import Link from "next/link";
import type { ReactNode } from "react";
import { DeprecationNoticeTrigger } from "@/components/DeprecationNotice";
import GiniMascot from "@/components/GiniMascot";
import ThemeToggle from "@/components/ThemeToggle";
import ChatDemo from "@/components/landing/ChatDemo";
import HeroHeadline from "@/components/landing/HeroHeadline";
import HowItWorks from "@/components/landing/HowItWorks";
import ProviderOrbit from "@/components/landing/ProviderOrbit";
import SchemaPreview from "@/components/landing/SchemaPreview";
import VizGallery from "@/components/landing/VizGallery";
import { DitherBranch, DitherGlow, RAMP_BLOCKS } from "@/components/landing/dither";
import { Reveal } from "@/components/landing/motion";

const bitcount = localFont({
  src: "../../public/font/BitcountSingle-VariableFont_CRSV,ELSH,ELXP,slnt,wght.ttf",
  variable: "--font-bitcount",
});

const NAV = [
  { href: "#how", label: "How it worked" },
  { href: "#viz", label: "Visualizations" },
  { href: "#schema", label: "Schema" },
  { href: "#keys", label: "Your keys" },
];

const QUESTIONS_A = [
  "Top 10 customers by lifetime value",
  "Which cities drove revenue last quarter?",
  "Orders by weekday and hour",
  "Monthly churn for the last year",
  "Average order value by plan",
  "Products with falling sales",
  "Signups vs churn by quarter",
];

const QUESTIONS_B = [
  "Is each rep hitting target?",
  "Where does our traffic come from?",
  "Revenue by region, split by plan",
  "Newest enterprise accounts",
  "Refund rate by payment method",
  "Daily active users this month",
  "Busiest hour for support tickets",
];

function SectionHeader({ index, eyebrow, title, children }: { index: string; eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-xs tracking-wide text-ink-tertiary">
        <span className="text-accent">[ {index} ]</span> {eyebrow}
      </p>
      <h2 className={`${bitcount.className} mt-4 text-3xl font-normal tracking-tight text-ink sm:text-4xl`}>{title}</h2>
      {children && <p className="mt-4 text-sm leading-relaxed text-ink-tertiary sm:text-base">{children}</p>}
    </Reveal>
  );
}

function Marquee({ items, reverse = false, duration }: { items: string[]; reverse?: boolean; duration: number }) {
  return (
    <div className="marquee mask-fade-x overflow-hidden">
      <div
        className="marquee-track flex w-max gap-3"
        style={{ animationDirection: reverse ? "reverse" : "normal", ["--marquee-duration" as string]: `${duration}s` }}
      >
        {[...items, ...items].map((q, i) => (
          <span
            key={i}
            aria-hidden={i >= items.length}
            className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-xs text-ink-secondary transition-colors hover:border-border-bright hover:text-ink"
          >
            <span className="font-mono text-accent">›</span>
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}

function FloatingChip({ className, delay, children }: { className: string; delay: string; children: ReactNode }) {
  return (
    <div className={`absolute z-10 hidden xl:block ${className}`}>
      <div className="float-y" style={{ animationDelay: delay }}>
        <div className="rise-in rounded-xl border border-border bg-card/90 p-3 shadow-glow-lg backdrop-blur" style={{ animationDelay: "1.2s" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-50 border-b border-border bg-bg/75 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-2 text-lg font-semibold text-ink">
            <GiniMascot size={28} />
            Datagini
          </a>
          <div className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-tertiary transition-colors hover:bg-surface hover:text-ink"
              >
                {n.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/auth/login" className="hidden text-sm font-medium text-ink-secondary transition hover:text-ink sm:block">
              Sign in
            </Link>
            <Link
              href="/auth/login?mode=signup"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition hover:border-border-bright sm:px-4"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main id="top" className="flex-1 overflow-x-clip">
        {/* ── Hero ── */}
        <section className="relative">
          <div className="dot-grid mask-radial pointer-events-none absolute inset-0 opacity-60" />
          <div className="pointer-events-none absolute right-0 top-0 h-[320px] w-[260px] opacity-60 [mask-image:linear-gradient(to_bottom_left,black_25%,transparent_72%)] sm:h-[520px] sm:w-[520px] sm:opacity-90">
            <DitherBranch origin={[1.02, -0.02]} angle={2.35} size={0.25} seed={11} depth={7} />
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 hidden h-[460px] w-[420px] [mask-image:linear-gradient(to_top_right,black_30%,transparent_85%)] md:block">
            <DitherBranch mode="ascii" origin={[-0.02, 1.02]} angle={-0.85} size={0.32} seed={4} depth={6} halo={false} />
          </div>

          <div className="relative flex flex-col items-center px-4 pb-10 pt-14 text-center sm:px-6 sm:pt-24">
            <DeprecationNoticeTrigger className="rise-in whitespace-nowrap bg-surface/80 text-xs text-ink-tertiary backdrop-blur">
              <Archive size={12} strokeWidth={1.75} className="text-accent" />
              <span className="sm:hidden">Archived · June 2026</span>
              <span className="hidden sm:inline">Archived project · last updated June 18, 2026</span>
              <span className="text-ink-dim">·</span>
              <span className="text-ink-secondary underline decoration-border-bright underline-offset-2">read why</span>
            </DeprecationNoticeTrigger>

            <HeroHeadline />

            <p className="rise-in mt-6 max-w-xl text-base leading-relaxed text-ink-tertiary sm:text-lg" style={{ animationDelay: "150ms" }}>
              Datagini plugged into your Postgres database, turned plain-English questions into SQL, ran it, and handed back
              interactive charts. All on your own AI key.
            </p>

            <div className="rise-in mt-9 flex flex-col items-center gap-3 sm:flex-row" style={{ animationDelay: "300ms" }}>
              <Link
                href="/auth/login?mode=signup"
                className="group flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-accent-inset transition hover:bg-accent-glow"
              >
                Try it anyway
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how"
                className="rounded-xl border border-border bg-bg/60 px-6 py-3 text-sm font-semibold text-ink-secondary backdrop-blur transition hover:border-border-bright hover:text-ink"
              >
                See how it worked
              </a>
            </div>
          </div>

          {/* Product shot */}
          <div className="relative mx-auto max-w-5xl px-4 pb-20 sm:px-6 sm:pb-28">
            <div className="pointer-events-none absolute -inset-x-6 -bottom-6 -top-24 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_70%)]">
              <DitherGlow />
            </div>

            <FloatingChip className="-left-4 top-16" delay="0s">
              <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                <Wrench size={12} className="text-accent" />
                <span className="font-mono text-ink">run_sql</span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-ink-dim">6 rows · 42 ms</p>
            </FloatingChip>
            <FloatingChip className="-right-6 top-40" delay="1.5s">
              <p className="text-[10px] text-ink-tertiary">Revenue, 6 months</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-ink">₹1.24Cr</p>
              <p className="text-[10px] font-medium text-accent">+22% vs last period</p>
            </FloatingChip>
            <FloatingChip className="-left-10 bottom-40" delay="3s">
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <Braces size={12} className="text-ink-dim" />
                <span className="text-ink-tertiary">&quot;layout&quot;:</span>
                <span className="text-accent">&quot;bar&quot;</span>
              </div>
            </FloatingChip>

            <Reveal className="relative mx-auto max-w-2xl">
              <ChatDemo />
            </Reveal>
          </div>
        </section>

        {/* ── Question marquee ── */}
        <section className="space-y-3 border-y border-border bg-surface/30 py-6">
          <Marquee items={QUESTIONS_A} duration={55} />
          <Marquee items={QUESTIONS_B} duration={65} reverse />
        </section>

        {/* ── How it worked ── */}
        <section id="how" className="scroll-mt-16 px-4 pt-24 sm:px-6 sm:pt-32">
          <SectionHeader index="01" eyebrow="How it worked" title="From connection string to chart.">
            One question, followed all the way through. Scroll to watch it move.
          </SectionHeader>
          <div className="mx-auto mt-16 max-w-6xl lg:mt-0">
            <HowItWorks />
          </div>
        </section>

        {/* ── Visualizations ── */}
        <section id="viz" className="relative scroll-mt-16 border-t border-border px-4 py-24 sm:px-6 sm:py-32">
          <div className="pointer-events-none absolute right-0 top-0 hidden h-[420px] w-[360px] opacity-80 [mask-image:linear-gradient(to_bottom_left,black_25%,transparent_80%)] lg:block">
            <DitherBranch mode="ascii" ramp={RAMP_BLOCKS} origin={[1.02, -0.02]} angle={2.4} size={0.3} seed={23} depth={6} halo={false} />
          </div>
          <SectionHeader index="02" eyebrow="Generative UI" title="13 ways to see an answer.">
            The model picked a layout for every result, or you forced one yourself. Hover the charts, sort the table, click
            through the layouts.
          </SectionHeader>
          <Reveal className="mx-auto mt-14 max-w-6xl">
            <VizGallery />
          </Reveal>
        </section>

        {/* ── Schema ── */}
        <section id="schema" className="relative scroll-mt-16 border-t border-border px-4 py-24 sm:px-6 sm:py-32">
          <div className="pointer-events-none absolute bottom-0 left-0 hidden h-[380px] w-[340px] opacity-90 [mask-image:linear-gradient(to_top_right,black_30%,transparent_85%)] lg:block">
            <DitherBranch origin={[-0.02, 1.02]} angle={-0.7} size={0.3} seed={31} depth={6} pixel={4} halo={false} />
          </div>
          <SectionHeader index="03" eyebrow="Schema explorer" title="Your schema, laid out clearly.">
            Every table, column and foreign key, mapped into a diagram the moment you connect.
          </SectionHeader>
          <Reveal className="relative mx-auto mt-14 max-w-3xl">
            <SchemaPreview />
          </Reveal>
        </section>

        {/* ── Your keys ── */}
        <section id="keys" className="scroll-mt-16 border-t border-border px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto grid max-w-5xl items-center gap-14 lg:grid-cols-2">
            <Reveal>
              <p className="font-mono text-xs tracking-wide text-ink-tertiary">
                <span className="text-accent">[ 04 ]</span> Bring your own key
              </p>
              <h2 className={`${bitcount.className} mt-4 text-3xl font-normal tracking-tight text-ink sm:text-4xl`}>
                Your keys. Your data.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-tertiary sm:text-base">
                Plug in OpenAI, Claude, Gemini, or any OpenAI-compatible endpoint. A free Llama 3.3 70B through NVIDIA
                NIM came built in.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  { icon: KeyRound, text: "API keys encrypted at rest, per project" },
                  { icon: Lock, text: "Connection strings encrypted before they're stored" },
                  { icon: Database, text: "Queries run against your database, not a copy of it" },
                  { icon: Sparkles, text: "Switch models per project, no lock-in" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-ink-secondary">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
                      <Icon size={14} strokeWidth={1.75} className="text-ink-tertiary" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={150}>
              <ProviderOrbit />
            </Reveal>
          </div>
        </section>

        {/* ── Epilogue ── */}
        <section className="relative overflow-hidden border-t border-border px-4 py-28 sm:px-6 sm:py-36">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] [mask-image:linear-gradient(to_left,black_20%,transparent_90%)] md:block">
            <DitherBranch mode="ascii" origin={[1.02, 0.55]} angle={Math.PI + 0.12} size={0.36} seed={42} depth={6} leaves={false} halo={false} />
          </div>
          <Reveal className="relative mx-auto max-w-5xl">
            <div className="max-w-xl">
              <p className="font-mono text-xs tracking-wide text-ink-tertiary">
                <span className="text-accent">[ -- ]</span> Epilogue
              </p>
              <h2 className={`${bitcount.className} mt-4 text-3xl font-normal tracking-tight text-ink sm:text-5xl`}>
                This one goes on the wall.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-ink-tertiary sm:text-base">
                A few months after I built it, AI assistants learned to do all of this right in the chat. That&apos;s how
                building feels right now: tools go out of date month by month. Datagini stays up as a snapshot of the
                moment it still needed solving.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <DeprecationNoticeTrigger className="px-4 py-2 text-sm text-ink-secondary">
                  <Archive size={14} strokeWidth={1.75} />
                  Read the full note
                </DeprecationNoticeTrigger>
                <Link
                  href="/auth/login?mode=signup"
                  className="flex items-center gap-1.5 px-2 py-2 text-sm text-ink-tertiary transition-colors hover:text-ink"
                >
                  Or try it anyway <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border py-4 text-xs text-ink-tertiary">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 px-6 text-center sm:flex-row sm:justify-between sm:gap-1">
          <p>Datagini · Talk to your database</p>
          <DeprecationNoticeTrigger />
          <a
            href="https://www.satishhebbal.design/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors duration-150 hover:text-ink-secondary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sa26-white.svg" alt="" className="h-4 w-4 [.light_&]:invert" />
            Built by Satish Hebbal
          </a>
        </div>
      </footer>
    </div>
  );
}
