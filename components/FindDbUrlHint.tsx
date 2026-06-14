"use client";

import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

const FIND_DB_URL_PROMPT = `I need to find the "connection string" (also called a connection URL) for my PostgreSQL database, so I can paste it into another app. It looks like: postgresql://username:password@host:5432/database-name

Ask me which company hosts my database (for example: Supabase, Neon, Railway, Render, AWS, DigitalOcean, or my own server) if you don't know, then give me exact, step-by-step instructions — including which menu and button to click — for where to find this connection string in that dashboard.`;

/** Small, subtle "copy a prompt" link that helps non-technical users find their DB connection string via an AI assistant. */
export default function FindDbUrlHint() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(FIND_DB_URL_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied — ignore.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy a prompt — paste it into ChatGPT, Gemini, Claude, or any AI assistant to get step-by-step help finding this"
      className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-dim transition-all duration-150 hover:text-ink-secondary active:scale-[0.97]"
    >
      {copied ? <Check size={12} strokeWidth={1.5} /> : <Sparkles size={12} strokeWidth={1.5} />}
      {copied ? "Prompt copied" : "Not sure where to find this?"}
    </button>
  );
}
