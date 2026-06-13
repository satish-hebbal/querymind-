"use client";

import { Database, Loader2, LogOut, Plus, Settings, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import GiniMascot from "@/components/GiniMascot";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import type { AiProvider, DbType, Project } from "@/types";

const DB_TYPE_LABELS: Record<DbType, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
};

const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: "Gemini",
  openai: "GPT-4o",
  claude: "Claude",
};

interface DashboardClientProps {
  projects: Project[];
  userEmail: string;
}

export default function DashboardClient({ projects: initialProjects, userEmail }: DashboardClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;

    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (response.ok) {
      setProjects((prev) => prev.filter((project) => project.id !== id));
    }
  }

  function handleCreated(project: Project) {
    setProjects((prev) => [project, ...prev]);
    setModalOpen(false);
  }

  return (
    <div className="page-fade min-h-screen bg-bg">
      <header className="flex h-[52px] items-center justify-between border-b border-border px-4 sm:px-6">
        <div className="flex items-center gap-2 text-ink">
          <GiniMascot size={28} />
          <span className="text-base font-semibold tracking-tight">Datagini</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-sm font-medium text-ink-secondary">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-sm text-ink-secondary sm:inline">{userEmail}</span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-ink-secondary transition-all duration-150 hover:border-border-bright hover:text-ink active:scale-[0.97]"
          >
            <LogOut size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">Your projects</h1>
          {projects.length > 0 && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="hidden items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg shadow-accent-inset transition-all duration-150 hover:bg-accent-glow active:scale-[0.97] sm:flex"
            >
              <Plus size={16} strokeWidth={1.5} />
              New Project
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <EmptyState onNewProject={() => setModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {projects.length > 0 && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="New Project"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-bg shadow-glow-lg transition-all duration-150 hover:bg-accent-glow active:scale-[0.97] sm:hidden"
        >
          <Plus size={22} strokeWidth={1.5} />
        </button>
      )}

      {modalOpen && <NewProjectModal onClose={() => setModalOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}

function EmptyState({ onNewProject }: { onNewProject: () => void }) {
  return (
    <div className="dot-grid flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-elevated text-ink-secondary">
        <Database size={28} strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-ink">No projects yet</h2>
        <p className="mt-1 text-sm text-ink-secondary">Connect your first database to get started</p>
      </div>
      <button
        type="button"
        onClick={onNewProject}
        className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-bg shadow-accent-inset transition-all duration-150 hover:bg-accent-glow active:scale-[0.97]"
      >
        <Plus size={16} strokeWidth={1.5} />
        New Project
      </button>
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:border-border-bright hover:shadow-glow-md">
      <div className="dot-grid relative flex items-center justify-between border-b border-border bg-elevated/30 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-elevated text-ink-secondary">
          <Database size={18} strokeWidth={1.5} />
        </div>
        <button
          type="button"
          onClick={() => onDelete(project.id)}
          aria-label="Delete project"
          className="rounded-md p-1.5 text-ink-dim transition-all duration-150 hover:bg-error/10 hover:text-error active:scale-[0.97]"
        >
          <Trash2 size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ink">{project.name}</h3>
          <p className="mt-0.5 truncate text-sm text-ink-secondary">{project.description || "No description"}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-secondary">
            {DB_TYPE_LABELS[project.db_type]}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-ink-secondary">
            <Sparkles size={12} strokeWidth={1.5} className="text-ink-secondary" />
            {AI_PROVIDER_LABELS[project.ai_provider]}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <Link
            href={`/project/${project.id}/chat`}
            className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-center text-sm font-medium text-ink transition-all duration-150 hover:border-border-bright hover:bg-card active:scale-[0.97]"
          >
            Open
          </Link>
          <Link
            href={`/project/${project.id}/config`}
            aria-label="Project settings"
            className="rounded-lg border border-border p-2 text-ink-dim transition-all duration-150 hover:border-border-bright hover:text-ink active:scale-[0.97]"
          >
            <Settings size={16} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dbUrl, setDbUrl] = useState("");
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
  const [aiApiKey, setAiApiKey] = useState("");
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleTestConnection() {
    if (!dbUrl.trim()) {
      setTestState("error");
      setTestError("Enter a connection URL first.");
      return;
    }

    setTestState("testing");
    setTestError(null);

    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbUrl: dbUrl.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestState("success");
      } else {
        setTestState("error");
        setTestError(data.error ?? "Connection failed.");
      }
    } catch (error) {
      setTestState("error");
      setTestError(error instanceof Error ? error.message : "Connection failed.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Project name is required.");
      return;
    }

    if (!dbUrl.trim()) {
      setFormError("Database connection URL is required.");
      return;
    }

    if ((aiProvider === "openai" || aiProvider === "claude") && !aiApiKey.trim()) {
      setFormError(`An API key is required for ${AI_PROVIDER_LABELS[aiProvider]}.`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          dbUrl: dbUrl.trim(),
          aiProvider,
          aiApiKey: aiApiKey.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error ?? "Failed to create project.");
        setSubmitting(false);
        return;
      }

      onCreated(data.project as Project);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to create project.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4 py-8 backdrop-blur-sm">
      <div className="page-fade max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-border-bright bg-card p-6 shadow-glow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">New Project</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink-dim transition-all duration-150 hover:text-ink active:scale-[0.97]"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="project-name" className="mb-1 block text-xs font-medium text-ink-secondary">
              Project name <span className="text-error">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My Event Business"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
            />
          </div>

          <div>
            <label htmlFor="project-description" className="mb-1 block text-xs font-medium text-ink-secondary">
              Description
            </label>
            <input
              id="project-description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional short description"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
            />
          </div>

          <div>
            <label htmlFor="project-db-url" className="mb-1 block text-xs font-medium text-ink-secondary">
              DB Connection URL <span className="text-error">*</span>
            </label>
            <textarea
              id="project-db-url"
              required
              rows={2}
              value={dbUrl}
              onChange={(event) => {
                setDbUrl(event.target.value);
                setTestState("idle");
              }}
              placeholder="postgresql://user:password@host:5432/database"
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-xs text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testState === "testing"}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-ink-secondary transition-all duration-150 hover:border-border-bright hover:text-ink active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {testState === "testing" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Test connection
              </button>
              {testState === "success" && <span className="text-xs text-success">Connected successfully</span>}
              {testState === "error" && <span className="text-xs text-error">{testError}</span>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Database type</label>
            <div className="flex items-center gap-2 rounded-lg border border-border-bright bg-elevated px-3 py-2 text-sm text-ink shadow-glow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/db-icons/postgresql-icon.svg" alt="" className="h-4 w-4 shrink-0" />
              PostgreSQL
            </div>
            <p className="mt-1.5 text-xs text-ink-dim">
              Datagini currently supports PostgreSQL and Postgres-compatible databases (Supabase, Neon, Railway, Render, etc.). More engines are on the roadmap.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">AI Provider</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAiProvider("gemini")}
                className={`rounded-lg border px-3 py-2 text-sm transition-all duration-150 active:scale-[0.97] ${
                  aiProvider === "gemini"
                    ? "border-border-bright bg-elevated text-ink shadow-glow-sm"
                    : "border-border text-ink-secondary hover:border-border-bright"
                }`}
              >
                Gemini (free)
              </button>
              <button
                type="button"
                onClick={() => setAiProvider("openai")}
                className={`rounded-lg border px-3 py-2 text-sm transition-all duration-150 active:scale-[0.97] ${
                  aiProvider === "openai"
                    ? "border-border-bright bg-elevated text-ink shadow-glow-sm"
                    : "border-border text-ink-secondary hover:border-border-bright"
                }`}
              >
                GPT-4o
              </button>
              <button
                type="button"
                onClick={() => setAiProvider("claude")}
                className={`rounded-lg border px-3 py-2 text-sm transition-all duration-150 active:scale-[0.97] ${
                  aiProvider === "claude"
                    ? "border-border-bright bg-elevated text-ink shadow-glow-sm"
                    : "border-border text-ink-secondary hover:border-border-bright"
                }`}
              >
                Claude
              </button>
            </div>
          </div>

          {(aiProvider === "openai" || aiProvider === "claude") && (
            <div>
              <label htmlFor="project-ai-key" className="mb-1 block text-xs font-medium text-ink-secondary">
                {AI_PROVIDER_LABELS[aiProvider]} API Key <span className="text-error">*</span>
              </label>
              <input
                id="project-ai-key"
                type="password"
                value={aiApiKey}
                onChange={(event) => setAiApiKey(event.target.value)}
                placeholder="sk-..."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-xs text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
              />
            </div>
          )}

          <p className="text-xs text-ink-dim">Your API key is stored encrypted and only used for your queries.</p>

          {formError && (
            <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{formError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-ink-secondary transition-all duration-150 hover:border-border-bright hover:text-ink active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg shadow-accent-inset transition-all duration-150 hover:bg-accent-glow active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
