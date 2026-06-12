"use client";

import { Menu } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ChatInput from "@/components/ChatInput";
import ChatWindow from "@/components/ChatWindow";
import Sidebar from "@/components/Sidebar";
import { createSession, deriveTitle, loadSessions, saveSessions } from "@/lib/sessions";
import type { ChatMessage, ChatSession, QueryApiError, QueryApiResponse } from "@/types";

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function HomePage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadSessions();

    if (stored.length > 0) {
      setSessions(stored);
      setActiveSessionId(stored[0].id);
    } else {
      const session = createSession();
      setSessions([session]);
      setActiveSessionId(session.id);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveSessions(sessions);
  }, [sessions, hydrated]);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];
  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  function handleNewChat() {
    if (activeSession && activeSession.messages.length === 0) {
      setSidebarOpen(false);
      return;
    }

    const session = createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setSidebarOpen(false);
  }

  function handleSelectSession(id: string) {
    setActiveSessionId(id);
    setSidebarOpen(false);
  }

  function handleDeleteSession(id: string) {
    const next = sessions.filter((session) => session.id !== id);
    const remaining = next.length > 0 ? next : [createSession()];

    setSessions(remaining);

    if (id === activeSessionId) {
      setActiveSessionId(remaining[0].id);
    }
  }

  const handleSubmit = useCallback(
    async (question: string) => {
      const sessionId = activeSessionId;
      if (!sessionId) return;

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

      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) return session;

          const isFirstMessage = session.messages.length === 0;

          return {
            ...session,
            title: isFirstMessage ? deriveTitle(question) : session.title,
            messages: [...session.messages, userMessage, assistantMessage],
            updatedAt: Date.now(),
          };
        })
      );

      setIsLoading(true);

      try {
        const response = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });

        const data = (await response.json()) as QueryApiResponse | QueryApiError;

        setSessions((prev) =>
          prev.map((session) => {
            if (session.id !== sessionId) return session;

            return {
              ...session,
              messages: session.messages.map((message) => {
                if (message.id !== assistantId) return message;

                if (!response.ok || "error" in data) {
                  const errorData = data as QueryApiError;
                  return {
                    ...message,
                    isLoading: false,
                    error: errorData.error ?? "Something went wrong.",
                    errorSql: errorData.sql,
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
              }),
              updatedAt: Date.now(),
            };
          })
        );
      } catch (error) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id !== sessionId) return session;

            return {
              ...session,
              messages: session.messages.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      isLoading: false,
                      error: error instanceof Error ? error.message : "Network error. Please try again.",
                    }
                  : message
              ),
            };
          })
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeSessionId]
  );

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar
        sessions={sortedSessions}
        activeSessionId={activeSessionId}
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <main className="flex h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center border-b border-border px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <ChatWindow messages={messages} onExampleClick={handleSubmit} />

        <ChatInput onSubmit={handleSubmit} disabled={isLoading} />
      </main>
    </div>
  );
}
