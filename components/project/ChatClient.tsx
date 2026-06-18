"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { History, SquarePen, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ChatInput from "@/components/ChatInput";
import ChatWindow from "@/components/ChatWindow";
import type { ChatHistoryItem, QueryResult, Session } from "@/types";

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function historyToUIMessages(items: ChatHistoryItem[]): UIMessage[] {
  return items.flatMap((item) => {
    const result: QueryResult | null = item.result_json;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assistantParts: any[] = [];
    if (result?.summary) {
      assistantParts.push({ type: "text", text: result.summary });
    }
    // Restore through the same generative-viz path used live: the stored `spec`
    // re-renders the same layout, and GenerativeViz derives a sensible one when
    // there's no spec, so history shows visualizations, not plain tables.
    if (result && (result.columns?.length ?? 0) > 0) {
      assistantParts.push({
        type: "tool-render_visualization",
        state: "output-available",
        toolCallId: item.id,
        input: { spec: result.spec ?? null },
        output: {
          spec: result.spec ?? null,
          sql: item.sql_generated ?? "",
          columns: result.columns ?? [],
          rows: result.rows ?? [],
          rowCount: result.rowCount ?? 0,
          question: item.question,
        },
      });
    }

    return [
      {
        id: `${item.id}-q`,
        role: "user" as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parts: [{ type: "text", text: item.question }] as any,
      },
      {
        id: `${item.id}-a`,
        role: "assistant" as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parts: assistantParts as any,
      },
    ] as UIMessage[];
  });
}

function groupSessionsByDate(sessions: Session[]): { label: string; items: Session[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const last7 = new Date(today);
  last7.setDate(today.getDate() - 7);

  const groups: { label: string; items: Session[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Last 7 days", items: [] },
  ];
  const monthMap = new Map<string, Session[]>();

  for (const session of sessions) {
    const date = new Date(session.created_at);
    if (isNaN(date.getTime())) { groups[0].items.push(session); continue; }
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (day >= today) groups[0].items.push(session);
    else if (day >= yesterday) groups[1].items.push(session);
    else if (date >= last7) groups[2].items.push(session);
    else {
      const key = date.toLocaleString("default", { month: "long", year: "numeric" });
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(session);
    }
  }

  const result = groups.filter((g) => g.items.length > 0);
  for (const [label, items] of monthMap) result.push({ label, items });
  return result;
}

interface ChatClientProps {
  projectId: string;
}

export default function ChatClient({ projectId }: ChatClientProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState("");
  const sessionsLoaded = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const forcedVizRef = useRef<string>("auto");

  // useChat with DefaultChatTransport — body() is evaluated on each request, capturing current sessionId from ref
  const [chatError, setChatError] = useState<string | null>(null);

  const { messages, sendMessage, setMessages, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ projectId, sessionId: sessionIdRef.current, forcedViz: forcedVizRef.current }),
    }),
    onError: (err) => {
      setChatError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    const pending = window.sessionStorage.getItem("datagini:pending-question");
    if (pending) {
      window.sessionStorage.removeItem("datagini:pending-question");
      setPrefill(pending);
    }
  }, []);

  // Load sessions on mount — sidebar is always visible on desktop, so don't gate on historyOpen
  useEffect(() => {
    if (sessionsLoaded.current) return;
    sessionsLoaded.current = true;
    setSessionsLoading(true);

    fetch(`/api/projects/${projectId}/sessions`)
      .then((r) => r.json())
      .then((data: { sessions?: Session[] }) => setSessions(data.sessions ?? []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, [projectId]);

  const handleSubmit = async (question: string, vizType: string = "auto") => {
    setChatError(null);
    forcedVizRef.current = vizType;
    // Create session on first message
    if (!sessionIdRef.current) {
      // Show a local session in the sidebar immediately (optimistic — before DB responds)
      const localId = createId();
      const localSession: Session = {
        id: localId,
        title: question.slice(0, 60),
        created_at: new Date().toISOString(),
      };
      sessionIdRef.current = localId;
      setSessions((prev) => [localSession, ...prev]);

      // Await session creation so sendMessage captures the real session ID
      try {
        const res = await fetch(`/api/projects/${projectId}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: question.slice(0, 60) }),
        });
        if (res.ok) {
          const newSession = (await res.json()) as Session;
          if (newSession?.id && newSession.id !== localId) {
            sessionIdRef.current = newSession.id;
            setSessions((prev) =>
              prev.map((s) =>
                s.id === localId ? { ...newSession, title: newSession.title || question.slice(0, 60) } : s
              )
            );
          }
        }
      } catch {
        // local entry stays — sendMessage will use the local ID
      }
    }

    sendMessage({ text: question });
  };

  const handleSessionSelect = async (session: Session) => {
    setHistoryOpen(false);
    setDeletingId(null);
    sessionIdRef.current = session.id;

    try {
      const res = await fetch(`/api/projects/${projectId}/sessions/${session.id}/messages`);
      const data = (await res.json()) as { messages?: ChatHistoryItem[]; error?: string };
      if (!res.ok) console.error("[history] messages fetch failed:", data.error);
      console.log(`[history] session ${session.id}: ${data.messages?.length ?? 0} message(s)`);
      setMessages(historyToUIMessages(data.messages ?? []));
    } catch (e) {
      console.error("[history] restore error:", e);
      setMessages([]);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    sessionIdRef.current = null;
    setDeletingId(null);
    setHistoryOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await fetch(`/api/projects/${projectId}/sessions/${id}`, { method: "DELETE" });
    } catch { /* best effort */ }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
    if (id === sessionIdRef.current) {
      setMessages([]);
      sessionIdRef.current = null;
    }
  };

  const grouped = groupSessionsByDate(sessions);

  return (
    <div className="flex h-full">
      <SessionPanel
        grouped={grouped}
        sessionsLoading={sessionsLoading}
        activeSessionId={sessionIdRef.current}
        deletingId={deletingId}
        onSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        onDeleteRequest={setDeletingId}
        onDeleteConfirm={handleDeleteSession}
        onDeleteCancel={() => setDeletingId(null)}
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
            <SquarePen size={16} strokeWidth={1.5} />
            New chat
          </button>
        </div>

        <ChatWindow
          messages={messages as UIMessage[]}
          onExampleClick={handleSubmit}
          onSuggestionClick={handleSubmit}
          isStreaming={isStreaming}
          chatError={chatError}
        />
        <ChatInput onSubmit={handleSubmit} disabled={isStreaming} prefill={prefill} />
      </div>
    </div>
  );
}

interface SessionPanelProps {
  grouped: { label: string; items: Session[] }[];
  sessionsLoading: boolean;
  activeSessionId: string | null;
  deletingId: string | null;
  onSelect: (session: Session) => void;
  onNewChat: () => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  open: boolean;
  onClose: () => void;
}

function SessionPanel({
  grouped, sessionsLoading, activeSessionId, deletingId,
  onSelect, onNewChat, onDeleteRequest, onDeleteConfirm, onDeleteCancel, open, onClose,
}: SessionPanelProps) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <h2 className="text-sm font-semibold text-ink">Chats</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNewChat}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-secondary transition-all duration-150 hover:bg-elevated hover:text-ink active:scale-[0.97]"
            >
              <SquarePen size={13} strokeWidth={1.5} />
              New chat
            </button>
            <button type="button" onClick={onClose} aria-label="Close"
              className="rounded-md p-1 text-ink-dim transition-all duration-150 hover:text-ink active:scale-[0.97] lg:hidden">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {sessionsLoading ? (
            <div className="space-y-2 px-1">
              {[...Array(5)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded-md bg-elevated" />)}
            </div>
          ) : grouped.length === 0 ? (
            <p className="px-2 text-sm text-ink-dim">No chats yet</p>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ label, items }) => (
                <div key={label}>
                  <p className="mb-1 px-2 text-xs font-medium text-ink-dim">{label}</p>
                  <ul className="space-y-0.5">
                    {items.map((session) =>
                      deletingId === session.id ? (
                        <li key={session.id} className="flex items-center gap-1 rounded-lg bg-elevated px-3 py-2">
                          <span className="flex-1 truncate text-xs text-ink-secondary">Delete this chat?</span>
                          <button type="button" onClick={() => onDeleteConfirm(session.id)}
                            className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-500/10">Delete</button>
                          <button type="button" onClick={onDeleteCancel}
                            className="rounded px-1.5 py-0.5 text-xs text-ink-dim hover:text-ink">Cancel</button>
                        </li>
                      ) : (
                        <li key={session.id} className="group relative flex items-center">
                          <button
                            type="button"
                            onClick={() => onSelect(session)}
                            className={`block w-full truncate rounded-lg px-3 py-2 pr-8 text-left text-sm transition-all duration-150 hover:bg-elevated hover:text-ink ${
                              activeSessionId === session.id ? "bg-elevated text-ink" : "text-ink-secondary"
                            }`}
                            title={session.title}
                          >
                            {session.title}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDeleteRequest(session.id); }}
                            aria-label="Delete chat"
                            className="absolute right-1 rounded p-1 text-ink-dim opacity-0 transition-all duration-150 hover:text-red-500 group-hover:opacity-100 active:scale-90"
                          >
                            <Trash2 size={13} strokeWidth={1.5} />
                          </button>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
