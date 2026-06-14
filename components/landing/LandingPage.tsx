import { ArrowRight, KeyRound, MessageSquareCode, Workflow } from "lucide-react";
import localFont from "next/font/local";
import Link from "next/link";
import GiniMascot from "@/components/GiniMascot";
import ThemeToggle from "@/components/ThemeToggle";
import ChatDemo from "@/components/landing/ChatDemo";
import SchemaPreview from "@/components/landing/SchemaPreview";

const bitcount = localFont({
  src: "../../public/font/BitcountSingle-VariableFont_CRSV,ELSH,ELXP,slnt,wght.ttf",
  variable: "--font-bitcount",
});

const PROVIDER_LOGOS = [
  { src: "/model-icons/openai-icon.svg", alt: "OpenAI" },
  { src: "/model-icons/claude-icon.svg", alt: "Claude" },
  { src: "/model-icons/gemini-icon.svg", alt: "Gemini" },
  { src: "/model-icons/mistral-ai-icon.svg", alt: "Mistral" },
  { src: "/model-icons/deepseek-logo-icon.svg", alt: "DeepSeek" },
  { src: "/model-icons/qwen-ai-icon.svg", alt: "Qwen" },
];

const FEATURES = [
  {
    icon: MessageSquareCode,
    title: "Ask in English, get real SQL",
    description:
      "Type a question. Datagini writes the query, runs it, and shows you the result — table, chart, or summary. No SQL knowledge needed.",
  },
  {
    icon: KeyRound,
    title: "Your keys. Your data.",
    description:
      "Plug in your own OpenAI, Claude, or Gemini API key. Nothing is proxied through our servers. Full control, zero lock-in.",
    extra: (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {PROVIDER_LOGOS.map(({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={alt} src={src} alt={alt} className="h-5 w-5 opacity-70" />
        ))}
      </div>
    ),
  },
  {
    icon: Workflow,
    title: "Understand your schema instantly",
    description:
      "Visual ER diagram of your database — tables, columns, foreign keys, and relationships — generated automatically on connect.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            <GiniMascot size={28} />
            Datagini
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/auth/login"
              className="text-sm font-medium text-ink-secondary transition hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/auth/login?mode=signup"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:border-border-bright"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center px-6 pt-12 pb-16 text-center sm:pt-20 sm:pb-20">
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-tertiary">
            PostgreSQL · Plain English · Bring your own AI key
          </span>

          <h1 className={`${bitcount.className} mt-6 max-w-3xl text-4xl font-normal tracking-tight text-ink sm:text-5xl`}>
            Bring your own AI key.
            <br />
            <span className="text-ink-tertiary">Talk to your database in plain English.</span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-ink-tertiary sm:text-lg">
            Connect your PostgreSQL database, ask questions the way you would ask a
            teammate, and get back SQL, charts, and plain-English summaries —
            powered by your own OpenAI, Claude, or Gemini key.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/auth/login?mode=signup"
              className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-accent-inset transition hover:bg-accent-glow"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-ink-secondary transition hover:border-border-bright hover:text-ink"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-4 text-xs text-ink-dim">Your API key. Your data. Nothing stored.</p>
        </section>

        {/* Trust bar */}
        <section className="border-y border-border px-6 py-3">
          <p className="mx-auto max-w-4xl text-center text-xs text-ink-tertiary sm:text-sm">
            Works with PostgreSQL · BYOK — OpenAI, Claude, Gemini · No data stored on our servers
          </p>
        </section>

        {/* Product demo */}
        <section className="px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={`${bitcount.className} text-2xl font-normal tracking-tight text-ink sm:text-3xl`}>
              Watch it answer
            </h2>
            <p className="mt-3 text-sm text-ink-tertiary sm:text-base">
              Ask a question the way you would ask a teammate. Datagini writes the
              SQL, runs it, and hands back a chart, table, or summary.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <ChatDemo />
          </div>
        </section>

        {/* Feature cards */}
        <section className="border-t border-border px-6 py-16 sm:py-24">
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description, extra }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6 text-left transition hover:border-border-bright"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface">
                  <Icon className="h-5 w-5 text-ink-tertiary" strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm text-ink-tertiary">{description}</p>
                {extra}
              </div>
            ))}
          </div>
        </section>

        {/* Schema explorer */}
        <section className="border-t border-border px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={`${bitcount.className} text-2xl font-normal tracking-tight text-ink sm:text-3xl`}>
              Your schema. Laid out clearly.
            </h2>
            <p className="mt-3 text-sm text-ink-tertiary sm:text-base">
              Every table, column, and foreign key — mapped into an interactive
              diagram the moment you connect.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <SchemaPreview />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-4 text-xs text-ink-tertiary">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-1 px-6 text-center sm:flex-row sm:justify-between">
          <p>Datagini — Talk to your database</p>
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
