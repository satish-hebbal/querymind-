"use client";

import type { ChatSession } from "@/types";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  open: boolean;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onClose: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  open,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClose,
}: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="text-lg font-semibold tracking-tight text-gray-100">Datagini</span>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-gray-200 transition hover:border-accent hover:bg-white/5"
          >
            <PlusIcon />
            New chat
          </button>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-2 text-xs font-medium uppercase tracking-wide text-gray-500">Recents</p>

          {sessions.length === 0 ? (
            <p className="mt-2 px-2 text-sm text-gray-500">No conversations yet</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {sessions.map((session) => (
                <li key={session.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    className={`block w-full truncate rounded-lg px-3 py-2 pr-8 text-left text-sm transition ${
                      session.id === activeSessionId
                        ? "bg-accent/15 text-white"
                        : "text-gray-300 hover:bg-white/5 hover:text-gray-100"
                    }`}
                  >
                    {session.title || "New chat"}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    aria-label="Delete conversation"
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-500 opacity-0 transition hover:bg-white/10 hover:text-gray-200 group-hover:opacity-100"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="border-t border-border px-4 py-3 text-xs text-gray-500">
          Ask your event data anything
        </div>
      </aside>
    </>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6h12Z" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
