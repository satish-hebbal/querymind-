"use client";

import { PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from "lucide-react";
import type { ChatSession } from "@/types";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  open: boolean;
  collapsed: boolean;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  open,
  collapsed,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClose,
  onToggleCollapse,
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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-all duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-16" : "lg:w-64"}`}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <span className={`text-lg font-semibold tracking-tight text-gray-100 ${collapsed ? "lg:hidden" : ""}`}>
            Datagini
          </span>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden rounded-lg p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-gray-200 lg:flex ${
              collapsed ? "mx-auto" : "ml-auto"
            }`}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={onNewChat}
            aria-label="New chat"
            className={`flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-gray-200 transition hover:border-accent hover:bg-white/5 ${
              collapsed ? "lg:justify-center lg:px-0" : ""
            }`}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>New chat</span>
          </button>
        </div>

        <nav className={`mt-4 flex-1 overflow-y-auto px-3 pb-4 ${collapsed ? "lg:hidden" : ""}`}>
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
                    <Trash2 className="h-4 w-4" />
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
