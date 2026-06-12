import { ArrowRight, MessageSquare, Sparkles, Workflow } from "lucide-react";
import localFont from "next/font/local";
import Link from "next/link";
import GiniMascot from "@/components/GiniMascot";

const bitcount = localFont({
  src: "../../public/font/BitcountSingle-VariableFont_CRSV,ELSH,ELXP,slnt,wght.ttf",
  variable: "--font-bitcount",
});

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Chat with your data",
    description: "Ask questions in plain English and get SQL, charts, tables, and summaries back instantly.",
  },
  {
    icon: Workflow,
    title: "Visual DB explorer",
    description: "See your schema as an interactive diagram — tables, columns, keys, and relationships.",
  },
  {
    icon: Sparkles,
    title: "Bring your own AI",
    description: "Works out of the box with Gemini, or plug in your own OpenAI or Claude API key.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <GiniMascot size={28} />
            Datagini
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-300 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/auth/login?mode=signup"
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:border-gray-500"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-gray-400">
          AI-powered database exploration
        </span>

        <h1 className={`${bitcount.className} mt-6 max-w-3xl text-4xl font-normal tracking-tight text-white sm:text-5xl`}>
          Talk to your database.
          <br />
          <span className="text-gray-400">Get answers instantly.</span>
        </h1>

        <p className="mt-4 max-w-xl text-base text-gray-400 sm:text-lg">
          Connect any PostgreSQL database, ask questions in plain English, and
          let Datagini turn them into SQL, charts, and clear summaries.
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
            className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:text-white"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-4xl gap-6 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="p-5 text-left">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-gray-400" />
                <div className="h-px flex-1 bg-border" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-4 text-xs text-gray-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-1 px-6 text-center sm:flex-row sm:justify-between">
          <p>Datagini — Talk to your database</p>
          <a
            href="https://www.satishhebbal.design/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors duration-150 hover:text-gray-300"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sa26-white.svg" alt="" className="h-4 w-4" />
            a satish&apos;s-lab project
          </a>
        </div>
      </footer>
    </div>
  );
}
