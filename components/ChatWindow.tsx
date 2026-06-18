"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { UIMessage } from "ai";
import type { QueryResult, ResultRow } from "@/types";
import GiniMascot from "./GiniMascot";
import GiniOnDb from "./GiniOnDb";
import GenerativeViz from "./GenerativeViz";
import ResultTable from "./ResultTable";

const THINKING_PHRASES = [
  "Asking your database nicely...",
  "Teaching SQL to speak English...",
  "Waking up the tables...",
  "Politely interrogating your database...",
  "Translating human → robot → SQL...",
  "Definitely not making this up...",
  "Convincing the database to cooperate...",
  "Running SELECT * FROM your_brain...",
  "Untangling the JOINs...",
  "Bribing the query optimizer...",
  "Herding the data into one place...",
  "Whispering sweet SQL to the server...",
  "Finding your rows in a haystack...",
  "Making your data feel seen...",
  "Arguing with the database (Gini wins)...",
  "Performing acts of extraordinary SQL-ery...",
  "Consulting the ancient scrolls of schema...",
  "Deploying the full might of SELECT...",
  "Inventing the perfect visualization...",
  "Gini is on it. Probably...",
  "Summoning the data spirits...",
  "Just vibing with your tables for a sec...",
  "Designing something you haven't seen before...",
];

function formatTime(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const EXAMPLE_QUESTIONS = [
  "What tables exist in this database?",
  "Show me the most recent 10 records in [largest table]",
  "How many rows are in each table?",
  "What are the relationships between tables?",
  "Show me all column names and types",
];

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "LIMIT", "OFFSET", "JOIN", "LEFT", "RIGHT",
  "INNER", "OUTER", "FULL", "ON", "AS", "AND", "OR", "NOT", "IN", "IS", "NULL", "COUNT", "SUM",
  "AVG", "MAX", "MIN", "DISTINCT", "HAVING", "INSERT", "UPDATE", "DELETE", "INTO", "VALUES", "SET",
  "CASE", "WHEN", "THEN", "ELSE", "END", "UNION", "ALL", "EXISTS", "BETWEEN", "LIKE", "ASC", "DESC", "WITH",
];
const SQL_KEYWORD_SET = new Set(SQL_KEYWORDS);
const SQL_KEYWORD_REGEX = new RegExp(`\\b(${SQL_KEYWORDS.join("|")})\\b`, "gi");

function highlightSql(sql: string): ReactNode[] {
  return sql.split(SQL_KEYWORD_REGEX).map((part, index) =>
    SQL_KEYWORD_SET.has(part.toUpperCase()) ? (
      <span key={index} className="font-semibold text-ink">{part}</span>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

interface ChatWindowProps {
  messages: UIMessage[];
  onExampleClick: (question: string) => void;
  onSuggestionClick: (question: string) => void;
  isStreaming?: boolean;
  chatError?: string | null;
}

export default function ChatWindow({ messages, onExampleClick, onSuggestionClick, isStreaming, chatError }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <GiniOnDb className="h-32 w-auto" />
        <div>
          <h2 className="text-xl font-semibold text-ink">Ask anything about your database</h2>
          <p className="mt-1 text-sm text-ink-secondary">Try one of these to get started</p>
        </div>
        <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {EXAMPLE_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onExampleClick(question)}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-ink-secondary transition-all duration-150 hover:border-border-bright hover:text-ink active:scale-[0.97]"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const showLoadingBubble = isStreaming && (!lastMessage || lastMessage.role === "user");

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-12">
      <div className="flex w-full flex-col gap-4">
        {messages.map((message, i) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSuggestionClick={onSuggestionClick}
            isLastMessage={i === messages.length - 1}
            isStreaming={isStreaming}
          />
        ))}
        {showLoadingBubble && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
              <GiniMascot typing size={28} />
            </div>
            <div className="py-1">
              <LoadingIndicator />
            </div>
          </div>
        )}
        {chatError && !isStreaming && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
              <GiniMascot size={28} />
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              {chatError}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onSuggestionClick,
  isLastMessage,
  isStreaming,
}: {
  message: UIMessage;
  onSuggestionClick: (q: string) => void;
  isLastMessage: boolean;
  isStreaming?: boolean;
}) {
  const time = formatTime(Date.now());
  const isLoading = isLastMessage && isStreaming && message.role === "assistant";

  if (message.role === "user") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textPart = (message.parts as any[])?.find((p: any) => p.type === "text");
    const text = textPart?.text ?? "";
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-elevated px-4 py-2.5 text-sm text-ink sm:max-w-[75%]">
          {text}
        </div>
        <span className="mt-1 pr-1 text-[11px] text-ink-dim">{time}</span>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = (message.parts as any[]) ?? [];
  const textParts = parts.filter((p: any) => p.type === "text" && p.text);

  // New generative viz parts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const genVizParts = parts.filter((p: any) => p.type === "tool-render_visualization");

  // Legacy run_sql parts with embedded visualization (from history)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legacySqlParts = parts.filter((p: any) =>
    p.type === "tool-run_sql" &&
    p.state === "output-available" &&
    p.output?.visualization
  );

  // run_sql parts without visualization (new format — just shows SQL viewer)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sqlInfoParts = parts.filter((p: any) =>
    p.type === "tool-run_sql" &&
    !(p.state === "output-available" && p.output?.visualization)
  );

  const hasContent = textParts.length > 0 || genVizParts.length > 0 || legacySqlParts.length > 0;

  if (!hasContent && isLoading) {
    return (
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
          <GiniMascot typing size={28} />
        </div>
        <div className="py-1">
          <LoadingIndicator />
        </div>
      </div>
    );
  }

  if (!hasContent && !isLoading) return null;

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
        <GiniMascot typing={isLoading} size={28} />
      </div>
      <div className="flex w-full min-w-0 flex-col gap-3">

        {/* 1. Summary text — always first (plain text, no bubble, kept readable-width) */}
        {textParts.length > 0 && (
          <div className="max-w-2xl px-0.5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(textParts as any[]).map((p: any, i: number) => {
              const txt = p.text as string;
              if (!txt || txt === "CANNOT_ANSWER") return null;
              return <p key={i} className="text-[15px] leading-relaxed text-ink">{txt}</p>;
            })}
          </div>
        )}

        {/* 2. Generative UI (new format) — AI-written React components */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {genVizParts.map((part: any, i: number) => {
          if (part.state === "input-available") {
            return (
              <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-elevated" />
            );
          }
          if (part.state === "output-available" && part.output) {
            const out = part.output;
            const data = (out.rows ?? []) as ResultRow[];
            const columns = (out.columns ?? []) as string[];
            const sql = (out.sql ?? "") as string;
            const question = (out.question ?? "") as string;
            if (data.length === 0 && columns.length === 0) return null;
            return (
              <div key={i} className="space-y-2">
                <GenerativeViz
                  spec={out.spec ?? null}
                  data={data}
                  columns={columns}
                  question={question}
                />
                {sql && <SqlViewer sql={sql} rowCount={out.rowCount as number} />}
              </div>
            );
          }
          return null;
        })}

        {/* 3. Legacy history format — run_sql with visualization field */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {legacySqlParts.map((part: any, i: number) => {
          const out = part.output;
          if (out.error) {
            return (
              <div key={i} className="rounded-2xl rounded-bl-sm border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {out.error}
              </div>
            );
          }
          const result: QueryResult = {
            sql: out.sql ?? "",
            columns: out.columns ?? [],
            rows: (out.rows ?? []) as QueryResult["rows"],
            rowCount: out.rowCount ?? 0,
          };
          return (
            <div key={i} className="space-y-2">
              <LegacyResultDisplay result={result} />
            </div>
          );
        })}

        {/* 4. SQL loading state (new format, input-available on run_sql) */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {sqlInfoParts.map((part: any, i: number) => {
          if (part.state === "input-available") {
            return (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-ink-secondary">
                <span className="flex gap-1">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ink-dim" />
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ink-dim" style={{ animationDelay: "200ms" }} />
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ink-dim" style={{ animationDelay: "400ms" }} />
                </span>
                Querying database…
              </div>
            );
          }
          return null;
        })}

        {isLoading && !hasContent && <LoadingIndicator />}

        <span className="pl-1 text-[11px] text-ink-dim">{time}</span>
      </div>
    </div>
  );
}

function LoadingIndicator() {
  const [phraseIndex, setPhraseIndex] = useState(() => Math.floor(Math.random() * THINKING_PHRASES.length));

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 py-1 text-sm text-ink-secondary">
      <span className="flex items-center gap-1">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ink-dim" style={{ animationDelay: "0ms" }} />
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ink-dim" style={{ animationDelay: "200ms" }} />
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ink-dim" style={{ animationDelay: "400ms" }} />
      </span>
      {THINKING_PHRASES[phraseIndex]}
    </div>
  );
}

// Used for history messages (old format with run_sql + visualization field)
function LegacyResultDisplay({ result }: { result: QueryResult }) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-card p-1">
        <ResultTable result={result} />
      </div>
      <SqlViewer sql={result.sql} rowCount={result.rowCount} />
    </div>
  );
}

function SqlViewer({ sql, rowCount }: { sql: string; rowCount?: number }) {
  const [open, setOpen] = useState(false);
  if (!sql) return null;

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-ink-secondary transition-colors duration-150 hover:text-ink"
      >
        <span className="flex items-center gap-2">
          <span>{open ? "Hide" : "Show"} generated SQL</span>
          {rowCount !== undefined && (
            <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-ink-dim">
              {rowCount} row{rowCount !== 1 ? "s" : ""}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={16} strokeWidth={1.5} className="text-ink-dim" /> : <ChevronDown size={16} strokeWidth={1.5} className="text-ink-dim" />}
      </button>
      {open && (
        <pre className="overflow-x-auto border-t border-border px-3 py-2 font-mono text-[13px] text-ink-secondary">
          <code>{highlightSql(sql)}</code>
        </pre>
      )}
    </div>
  );
}
