"use client";

import {
  ArrowLeft,
  Menu,
  MessageSquare,
  PanelLeftClose,
  Settings,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import GiniMascot from "@/components/GiniMascot";
import { GiniProvider, useGini } from "@/lib/gini-context";
import type { Project } from "@/types";

interface ProjectShellProps {
  project: Project;
  children: ReactNode;
}

export default function ProjectShell({ project, children }: ProjectShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <GiniProvider>
      <div className="flex h-screen bg-bg">
        <ProjectSidebar
          project={project}
          open={sidebarOpen}
          collapsed={collapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />

        <div className="flex h-screen min-w-0 flex-1 flex-col">
          <header className="flex items-center border-b border-border px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="rounded-lg p-1.5 text-ink-secondary transition-all duration-150 hover:bg-elevated hover:text-ink active:scale-[0.97]"
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>
            <span className="ml-3 truncate text-sm font-medium text-ink">{project.name}</span>
          </header>

          <div className="flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </GiniProvider>
  );
}

interface ProjectSidebarProps {
  project: Project;
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

const NAV_ITEMS = [
  { href: "chat", label: "Chat", icon: MessageSquare },
  { href: "visualizer", label: "DB Visualizer", icon: Workflow },
  { href: "config", label: "Config", icon: Settings },
];

function ProjectSidebar({ project, open, collapsed, onClose, onToggleCollapse }: ProjectSidebarProps) {
  const pathname = usePathname();
  const { isTyping } = useGini();

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[220px] shrink-0 flex-col border-r border-border bg-surface transition-all duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-14" : "lg:w-[220px]"}`}
      >
        <div className="flex items-center gap-2.5 px-3 py-4">
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150 hover:bg-elevated active:scale-[0.97]"
            >
              <GiniMascot typing={isTyping} size={28} />
            </button>
          ) : (
            <div title="Datagini" className="flex h-9 w-9 shrink-0 items-center justify-center">
              <GiniMascot typing={isTyping} size={28} />
            </div>
          )}
          <span className={`truncate text-sm font-semibold tracking-tight text-ink ${collapsed ? "lg:hidden" : ""}`}>
            {project.name}
          </span>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className={`ml-auto hidden rounded-lg p-1.5 text-ink-dim transition-all duration-150 hover:bg-elevated hover:text-ink active:scale-[0.97] lg:flex ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            <PanelLeftClose size={16} strokeWidth={1.5} />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-2.5">
          {NAV_ITEMS.map((item) => {
            const href = `/project/${project.id}/${item.href}`;
            const active = pathname?.startsWith(href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={href}
                onClick={onClose}
                title={item.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 active:scale-[0.97] ${
                  active
                    ? "glass text-ink shadow-glow-sm"
                    : "text-ink-secondary hover:bg-elevated hover:text-ink"
                } ${collapsed ? "lg:justify-center" : ""}`}
              >
                <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-2.5 py-3">
          <Link
            href="/dashboard"
            title="Back to Dashboard"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-dim transition-all duration-150 hover:bg-elevated hover:text-ink active:scale-[0.97] ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <ArrowLeft size={18} strokeWidth={1.5} className="shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>Back to Dashboard</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
