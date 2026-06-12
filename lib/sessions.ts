import type { ChatSession } from "@/types";

const STORAGE_KEY = "datagini:sessions";
const TITLE_MAX_LENGTH = 48;

export function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ChatSession[];
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage may be full or unavailable (e.g. private browsing) - ignore.
  }
}

export function createSession(): ChatSession {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveTitle(question: string): string {
  const trimmed = question.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}…`;
}
