"use client";

import { AlertTriangle, ChevronDown, ChevronUp, Info, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ChatMessage, QueryResult, ViewMode } from "@/types";
import GiniMascot from "./GiniMascot";
import ResultChart, { detectChartKind } from "./ResultChart";
import ResultTable from "./ResultTable";

const THINKING_PHRASES = [
  "Thinking...",
  "Connecting to your database...",
  "Reading your tables...",
  "Writing a query...",
  "Crunching the numbers...",
];

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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
      <span key={index} className="font-semibold text-ink">
        {part}
      </span>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

interface ChatWindowProps {
  messages: ChatMessage[];
  onExampleClick: (question: string) => void;
}

export default function ChatWindow({ messages, onExampleClick }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-elevated text-ink-secondary">
          <Sparkles size={22} strokeWidth={1.5} />
        </div>
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

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const time = formatTime(message.timestamp);

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-elevated px-4 py-2.5 text-sm text-ink sm:max-w-[75%]">
          {message.content}
        </div>
        <span className="mt-1 pr-1 text-[11px] text-ink-dim">{time}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
        <GiniMascot typing={message.isLoading} size={28} />
      </div>
      <div className="flex min-w-0 max-w-[95%] flex-col sm:max-w-[85%]">
        <div className="w-full rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3">
          {message.isLoading && <LoadingIndicator />}
          {!message.isLoading && message.error && <ErrorCard message={message} />}
          {!message.isLoading && message.result && <ResultDisplay result={message.result} />}
        </div>
        <span className="mt-1 pl-1 text-[11px] text-ink-dim">{time}</span>
      </div>
    </div>
  );
}

function LoadingIndicator() {
  const [phraseIndex, setPhraseIndex] = useState(0);

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

function ErrorCard({ message }: { message: ChatMessage }) {
  const isSoft = message.errorKind === "soft";

  return (
    <div className="space-y-2">
      <div
        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
          isSoft ? "border-border bg-surface text-ink-secondary" : "border-error/30 bg-error/10 text-error"
        }`}
      >
        {isSoft ? (
          <Info size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink-dim" />
        ) : (
          <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
        )}
        <span>{message.error}</span>
      </div>
      {message.errorSql && <SqlViewer sql={message.errorSql} />}
    </div>
  );
}

function ResultDisplay({ result }: { result: QueryResult }) {
  const chartKind = detectChartKind(result.columns, result.rows);
  const canChart = chartKind !== "table";
  const [view, setView] = useState<ViewMode>("table");

  return (
    <div className="space-y-3">
      {result.summary && <p className="text-sm text-ink">{result.summary}</p>}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-secondary">
          {result.rowCount} {result.rowCount === 1 ? "row" : "rows"}
        </span>
        {canChart && (
          <div className="flex gap-1 rounded-full border border-border bg-surface p-1 text-xs">
            <ToggleButton active={view === "chart"} onClick={() => setView("chart")}>
              Chart
            </ToggleButton>
            <ToggleButton active={view === "table"} onClick={() => setView("table")}>
              Table
            </ToggleButton>
          </div>
        )}
      </div>

      {view === "chart" && canChart ? <ResultChart result={result} /> : <ResultTable result={result} />}

      <SqlViewer sql={result.sql} />
    </div>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 transition-all duration-150 active:scale-[0.97] ${
        active ? "bg-ink text-bg" : "text-ink-secondary hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function SqlViewer({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-ink-secondary transition-colors duration-150 hover:text-ink"
      >
        <span>{open ? "Hide" : "Show"} generated SQL</span>
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
