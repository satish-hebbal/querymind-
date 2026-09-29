"use client";

import { Archive, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "datagini-deprecation-dismissed";
const LAST_UPDATED = "June 18, 2026";
const OPEN_EVENT = "datagini:open-deprecation-notice";

export function DeprecationNoticeTrigger({ className = "", children }: { className?: string; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 transition-colors duration-150 hover:border-border-bright hover:text-ink-secondary ${className}`}
    >
      {children ?? (
        <>
          <Archive size={12} strokeWidth={1.5} />
          No longer maintained
        </>
      )}
    </button>
  );
}

export default function DeprecationNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // sessionStorage unavailable; always show the notice
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // dismissal just won't persist for this session
    }
  };

  if (!open) return null;

  return (
    <div className="page-fade fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deprecation-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-glow-lg"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition-colors duration-150 hover:bg-elevated hover:text-ink"
        >
          <X size={16} strokeWidth={1.5} />
        </button>

        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-elevated text-ink-secondary">
          <Archive size={20} strokeWidth={1.5} />
        </div>

        <h2 id="deprecation-title" className="text-lg font-semibold text-ink">
          This one goes on my wall of failures
        </h2>
        <p className="mt-1 font-mono text-xs text-ink-tertiary">
          Last updated {LAST_UPDATED}
        </p>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-secondary">
          <p>
            I built Datagini so you could plug in your database, ask questions in plain English,
            and get back charts, tables, and schema diagrams. At the time, that felt like a real
            gap worth filling.
          </p>
          <p>
            A few months later, it isn&apos;t. AI models got good enough that you can ask Claude,
            ChatGPT, or the agent in your IDE the same question and get the query and the chart
            right there in the chat.
          </p>
          <p>
            That&apos;s how building feels right now. Tools, toolkits, and whole ideas go out of
            date month by month. This was my honest attempt at visualizing data back when it still
            needed solving, and I&apos;m leaving it up as a record of that.
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-all duration-150 hover:bg-accent-glow active:scale-[0.98]"
        >
          Look around anyway
        </button>
      </div>
    </div>
  );
}
