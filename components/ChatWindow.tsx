"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ChatMessage, QueryResult, ViewMode } from "@/types";
import ResultChart, { detectChartKind } from "./ResultChart";
import ResultTable from "./ResultTable";

const EXAMPLE_QUESTIONS = [
  "Which events made the most revenue?",
  "Show monthly revenue for 2024",
  "How many tickets sold per city?",
  "Which clients have the most bookings?",
  "Show all upcoming events",
];

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
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Ask anything about your events</h2>
          <p className="mt-1 text-sm text-gray-400">Try one of these to get started</p>
        </div>
        <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {EXAMPLE_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onExampleClick(question)}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-gray-300 transition hover:border-accent hover:text-white"
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
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-white sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 sm:max-w-[85%]">
        {message.isLoading && <LoadingIndicator />}
        {!message.isLoading && message.error && <ErrorCard message={message} />}
        {!message.isLoading && message.result && <ResultDisplay result={message.result} />}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1 text-sm text-gray-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-accent" />
      Thinking...
    </div>
  );
}

function ErrorCard({ message }: { message: ChatMessage }) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        {message.error}
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
      {result.summary && <p className="text-sm text-gray-100">{result.summary}</p>}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400">
          {result.rowCount} {result.rowCount === 1 ? "row" : "rows"}
        </span>
        {canChart && (
          <div className="flex gap-1 rounded-lg border border-border bg-bg p-1 text-xs">
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
      className={`rounded-md px-3 py-1 transition ${
        active ? "bg-accent text-white" : "text-gray-400 hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function SqlViewer({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-bg">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-gray-400 transition hover:text-gray-200"
      >
        <span>{open ? "Hide" : "Show"} generated SQL</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>
      {open && (
        <pre className="overflow-x-auto border-t border-border px-3 py-2 text-xs text-gray-300">
          <code>{sql}</code>
        </pre>
      )}
    </div>
  );
}
