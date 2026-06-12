"use client";

import { useCallback, useState } from "react";
import ChatInput from "@/components/ChatInput";
import ChatWindow from "@/components/ChatWindow";
import type { ChatMessage, QueryApiError, QueryApiResponse } from "@/types";

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (question: string) => {
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
        body: JSON.stringify({ question }),
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
            },
          };
        })
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                isLoading: false,
                error: error instanceof Error ? error.message : "Network error. Please try again.",
              }
            : message
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <main className="flex h-screen flex-col bg-bg">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-gray-100">QueryMind</h1>
        <p className="text-sm text-gray-400">Ask your event data anything</p>
      </header>

      <ChatWindow messages={messages} onExampleClick={handleSubmit} />

      <ChatInput onSubmit={handleSubmit} disabled={isLoading} />
    </main>
  );
}
