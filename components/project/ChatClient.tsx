"use client";

import { History, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ChatInput from "@/components/ChatInput";
import ChatWindow from "@/components/ChatWindow";
import type { ChatHistoryItem, ChatMessage, QueryApiError, QueryApiResponse } from "@/types";

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ChatClientProps {
  projectId: string;
  initialHistory: ChatHistoryItem[];
}

export default function ChatClient({ projectId, initialHistory }: ChatClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ChatHistoryItem[]>(initialHistory);
  const [isLoading, setIsLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [prefill, setPrefill] = useState("");

  useEffect(() => {
    const pending = window.sessionStorage.getItem("datagini:pending-question");
    if (pending) {
      window.sessionStorage.removeItem("datagini:pending-question");
      setPrefill(pending);
    }
  }, []);

  const handleSubmit = useCallback(
    async (question: string) => {
      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content: question,
        timestamp: Date.now(),
      };

      const assistantId = createId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        isLoading: true,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);

      try {
        const response = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, question }),
        });

        const data = (await response.json()) as QueryApiResponse | QueryApiError;

        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== assistantId) return message;

            if (!response.ok || "error" in data) {
              const errorData = data as QueryApiError;
              return {
                ...message,
                isLoading: false,
                error: errorData.error ?? "Something went wrong.",
                errorSql: errorData.sql,
                errorKind: errorData.errorKind ?? "hard",
              };
            }

            return {
              ...message,
              isLoading: false,
              result: {
                sql: data.sql,
                columns: data.columns,
                rows: data.rows,
                rowCount: data.rowCount,
                summary: data.summary,
              },
            };
          })
        );

        if (response.ok && !("error" in data)) {
          const entry: ChatHistoryItem = {
            id: data.chatId ?? createId(),
            question,
            sql_generated: data.sql,
            result_json: {
              sql: data.sql,
              columns: data.columns,
              rows: data.rows,
              rowCount: data.rowCount,
              summary: data.summary,
            },
            created_at: new Date().toISOString(),
          };

          setHistory((prev) => [entry, ...prev].slice(0, 20));
        }
      } catch (error) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  isLoading: false,
                  error: error instanceof Error ? error.message : "Network error. Please try again.",
                  errorKind: "hard",
                }
              : message
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  function handleHistorySelect(item: ChatHistoryItem) {
    const timestamp = new Date(item.created_at).getTime();

    setMessages([
      { id: `${item.id}-q`, role: "user", content: item.question, timestamp },
      { id: `${item.id}-a`, role: "assistant", content: "", result: item.result_json ?? undefined, timestamp },
    ]);
    setHistoryOpen(false);
  }

  function handleNewChat() {
    setMessages([]);
    setHistoryOpen(false);
  }

  return (
    <div className="flex h-full">
      <HistoryPanel
        history={history}
        onSelect={handleHistorySelect}
        onNewChat={handleNewChat}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-ink-secondary transition-all duration-150 hover:text-ink active:scale-[0.97]"
          >
            <History size={16} strokeWidth={1.5} />
            History
          </button>
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-ink-secondary transition-all duration-150 hover:text-ink active:scale-[0.97]"
          >
            <Plus size={16} strokeWidth={1.5} />
            New chat
          </button>
        </div>

        <ChatWindow messages={messages} onExampleClick={handleSubmit} />
        <ChatInput onSubmit={handleSubmit} disabled={isLoading} prefill={prefill} />
      </div>
    </div>
  );
}

interface HistoryPanelProps {
  history: ChatHistoryItem[];
  onSelect: (item: ChatHistoryItem) => void;
  onNewChat: () => void;
  open: boolean;
  onClose: () => void;
}

function HistoryPanel({ history, onSelect, onNewChat, open, onClose }: HistoryPanelProps) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <h2 className="text-sm font-semibold text-ink">Recent questions</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNewChat}
              aria-label="New chat"
              className="rounded-md p-1 text-ink-secondary transition-all duration-150 hover:text-ink active:scale-[0.97]"
            >
              <Plus size={16} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close history"
              className="rounded-md p-1 text-ink-dim transition-all duration-150 hover:text-ink active:scale-[0.97] lg:hidden"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {history.length === 0 ? (
            <p className="px-2 text-sm text-ink-dim">No questions yet</p>
          ) : (
            <ul className="space-y-1">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-ink-secondary transition-all duration-150 hover:bg-elevated hover:text-ink"
                    title={item.question}
                  >
                    {item.question}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>
    </>
  );
}
