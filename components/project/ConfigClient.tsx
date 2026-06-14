"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Trash2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AI_PROVIDER_ICONS, AI_PROVIDER_LABELS, CUSTOM_PROVIDER_EXAMPLES, DB_TYPE_ICONS, DB_TYPE_LABELS } from "@/lib/provider-meta";
import type { AiProvider, ProjectConfig } from "@/types";

const AI_PROVIDER_INFO: Record<AiProvider, { label: string; note: string; keyUrl: string; keyUrlLabel: string; requiresKey: boolean }> = {
  gemini: {
    label: AI_PROVIDER_LABELS.gemini,
    note: "Uses Google's Gemini 2.5 Flash model. A shared free-tier key is used by default — add your own key for higher rate limits.",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyUrlLabel: "Get a Gemini API key",
    requiresKey: false,
  },
  openai: {
    label: AI_PROVIDER_LABELS.openai,
    note: "Uses OpenAI's GPT-4o model. Requires your own OpenAI API key.",
    keyUrl: "https://platform.openai.com/api-keys",
    keyUrlLabel: "Get an OpenAI API key",
    requiresKey: true,
  },
  claude: {
    label: AI_PROVIDER_LABELS.claude,
    note: "Uses Anthropic's Claude 3.5 Haiku model. Requires your own Anthropic API key.",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyUrlLabel: "Get an Anthropic API key",
    requiresKey: true,
  },
  custom: {
    label: AI_PROVIDER_LABELS.custom,
    note: "Connects to any OpenAI-compatible API — DeepSeek, Qwen, Mistral, OpenRouter, or a self-hosted server (Ollama, vLLM, LM Studio, etc.). Set the base URL and model name below, and add an API key if your endpoint requires one.",
    keyUrl: "",
    keyUrlLabel: "",
    requiresKey: false,
  },
};

const GUIDE_STEPS: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "1. Connect your database",
    body: "Grab a connection string from your database provider (Supabase, Neon, Railway, Render, or your own Postgres instance) and paste it into the Database tab. Use \"Test connection\" to confirm Datagini can reach it before saving.",
    icon: Database,
  },
  {
    title: "2. Choose an AI model",
    body: "By default, Datagini uses a shared Gemini key so you can start asking questions immediately. For higher limits or a different model, switch providers in the AI Model tab and add your own OpenAI or Claude API key.",
    icon: Sparkles,
  },
  {
    title: "3. Explore your schema",
    body: "Open the DB Visualizer to see every table, its columns, primary/foreign keys, and how tables relate to each other. Click any table to view its row count and a sample of its data.",
    icon: Workflow,
  },
  {
    title: "4. Ask questions in plain English",
    body: 'Head to the Chat tab and ask things like "How many rows are in each table?" or "Show me the most recent 10 records in [table]". Datagini converts your question into SQL, runs it safely (read-only), and summarizes the results.',
    icon: MessageSquare,
  },
];

type Tab = "database" | "ai" | "guide";

function selectorButtonClass(active: boolean): string {
  return `flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-150 active:scale-[0.97] ${
    active
      ? "border-border-bright bg-elevated text-ink shadow-glow-sm"
      : "border-border text-ink-secondary hover:border-border-bright"
  }`;
}

interface ConfigClientProps {
  projectId: string;
  config: ProjectConfig;
}

export default function ConfigClient({ projectId, config }: ConfigClientProps) {
  const [tab, setTab] = useState<Tab>("database");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested === "database" || requested === "ai" || requested === "guide") {
      setTab(requested);
    }
  }, []);

  return (
    <div className="page-fade h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-2xl font-semibold text-ink">{config.name}</h1>
        <p className="mb-6 text-sm text-ink-secondary">Project configuration</p>

        <div className="mb-6 flex gap-1 border-b border-border">
          <TabButton active={tab === "database"} onClick={() => setTab("database")} icon={Database} label="Database" />
          <TabButton active={tab === "ai"} onClick={() => setTab("ai")} icon={Sparkles} label="AI Model" />
          <TabButton active={tab === "guide"} onClick={() => setTab("guide")} icon={SettingsIcon} label="Setup Guide" />
        </div>

        {tab === "database" && <DatabaseTab projectId={projectId} config={config} />}
        {tab === "ai" && <AiModelTab projectId={projectId} config={config} />}
        {tab === "guide" && <SetupGuideTab />}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

function TabButton({ active, onClick, icon: Icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
        active ? "border-ink text-ink" : "border-transparent text-ink-secondary hover:text-ink"
      }`}
    >
      <Icon size={16} strokeWidth={1.5} />
      {label}
    </button>
  );
}

type AsyncState = "idle" | "saving" | "success" | "error";

function DatabaseTab({ projectId, config }: { projectId: string; config: ProjectConfig }) {
  const router = useRouter();
  const [dbUrlInput, setDbUrlInput] = useState("");
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<AsyncState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleTestConnection() {
    setTestState("testing");
    setTestError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbUrlInput.trim() ? { dbUrl: dbUrlInput.trim() } : {}),
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

  async function handleSave() {
    setSaveState("saving");
    setSaveError(null);

    const body: Record<string, unknown> = {};
    if (dbUrlInput.trim()) body.dbUrl = dbUrlInput.trim();

    if (Object.keys(body).length === 0) {
      setSaveState("error");
      setSaveError("Enter a new connection URL to save.");
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveState("error");
        setSaveError(data.error ?? "Failed to save.");
        return;
      }

      setSaveState("success");
      setDbUrlInput("");
      setTestState("idle");
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Failed to save.");
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== config.name) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error ?? "Failed to delete project.");
        setDeleting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete project.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 transition-colors duration-200">
        <h2 className="mb-1 text-sm font-semibold text-ink">Connection</h2>
        <p className="mb-4 text-xs text-ink-dim">
          Your database connection string is encrypted at rest and never shown in full. Every query Datagini
          runs is wrapped in a read-only transaction and limited to a single SELECT statement.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-secondary">Current connection</label>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-[13px] text-ink-secondary">
            {config.db_url_masked}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="db-url" className="mb-1 block text-xs font-medium text-ink-secondary">
            Update connection URL
          </label>
          <textarea
            id="db-url"
            rows={2}
            value={dbUrlInput}
            onChange={(event) => {
              setDbUrlInput(event.target.value);
              setTestState("idle");
            }}
            placeholder="Leave blank to keep the current connection"
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-[13px] text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-secondary">Database type</label>
          <div className="flex items-center gap-2 rounded-lg border border-border-bright bg-elevated px-3 py-2 text-sm text-ink shadow-glow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DB_TYPE_ICONS.postgresql} alt="" className="h-4 w-4 shrink-0" />
            {DB_TYPE_LABELS.postgresql}
          </div>
          <p className="mt-1.5 text-xs text-ink-dim">
            Datagini currently supports PostgreSQL and Postgres-compatible databases. More engines are on the roadmap.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="ml-auto flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-all duration-150 hover:bg-accent-glow hover:shadow-glow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>

        {saveState === "success" && <p className="mt-2 text-xs text-success">Saved.</p>}
        {saveState === "error" && <p className="mt-2 text-xs text-error">{saveError}</p>}
      </section>

      <ReadOnlyRoleHelper />

      <section className="rounded-2xl border border-error/30 bg-card p-5 transition-colors duration-200">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-error">
          <AlertTriangle size={16} strokeWidth={1.5} />
          Danger Zone
        </h2>
        <p className="mb-4 text-xs text-ink-dim">
          Deleting this project permanently removes its configuration and chat history. This cannot be undone.
        </p>

        <label htmlFor="delete-confirm" className="mb-1 block text-xs font-medium text-ink-secondary">
          Type <span className="font-mono text-ink-secondary">{config.name}</span> to confirm
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={deleteConfirm}
          onChange={(event) => setDeleteConfirm(event.target.value)}
          className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink transition-all duration-150 focus:border-error focus:outline-none"
        />

        {deleteError && <p className="mb-2 text-xs text-error">{deleteError}</p>}

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteConfirm !== config.name || deleting}
          className="flex items-center gap-2 rounded-lg bg-error px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-error/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
          <Trash2 size={16} strokeWidth={1.5} />
          Delete project
        </button>
      </section>
    </div>
  );
}

const READONLY_ROLE_SQL = `CREATE ROLE datagini_readonly WITH LOGIN PASSWORD 'choose-a-strong-password';
GRANT CONNECT ON DATABASE your_database TO datagini_readonly;
GRANT USAGE ON SCHEMA public TO datagini_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO datagini_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO datagini_readonly;`;

function ReadOnlyRoleHelper() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(READONLY_ROLE_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied — ignore, the snippet is still selectable.
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 transition-colors duration-200">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        <ShieldCheck size={16} strokeWidth={1.5} className="text-accent" />
        Use a read-only database user (recommended)
      </h2>
      <p className="mb-3 text-xs text-ink-dim">
        Datagini only ever issues a single SELECT statement per query, inside a read-only transaction. For
        the strongest guarantee, don&apos;t connect with your main database credentials at all — create a
        dedicated user that can only read, then use that connection string above. Run this once in your
        database (e.g. the SQL editor in Supabase or Neon, or via psql), replacing the placeholders:
      </p>

      <div className="relative">
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface px-3 py-2.5 pr-16 font-mono text-[11px] leading-relaxed text-ink-secondary">
          {READONLY_ROLE_SQL}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-ink-secondary transition-all duration-150 hover:border-border-bright hover:text-ink active:scale-[0.97]"
        >
          {copied ? <Check size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="mt-3 text-xs text-ink-dim">
        Then update your connection URL above to use{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-[11px] text-ink-secondary">datagini_readonly</code> and its
        password instead of your admin user. This way, even if a query were ever crafted to attempt a write, the
        database itself — not just Datagini — would refuse it.
      </p>
    </section>
  );
}

function AiModelTab({ projectId, config }: { projectId: string; config: ProjectConfig }) {
  const [aiProvider, setAiProvider] = useState<AiProvider>(config.ai_provider);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(config.has_ai_api_key);
  const [aiBaseUrl, setAiBaseUrl] = useState(config.ai_base_url ?? "");
  const [aiModel, setAiModel] = useState(config.ai_model ?? "");
  const [saveState, setSaveState] = useState<AsyncState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const info = AI_PROVIDER_INFO[aiProvider];

  async function saveConfig(body: Record<string, unknown>): Promise<boolean> {
    setSaveState("saving");
    setSaveError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveState("error");
        setSaveError(data.error ?? "Failed to save.");
        return false;
      }

      setSaveState("success");
      return true;
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Failed to save.");
      return false;
    }
  }

  async function handleSave() {
    if (aiProvider === "custom") {
      if (!aiBaseUrl.trim() || !/^https?:\/\//i.test(aiBaseUrl.trim())) {
        setSaveState("error");
        setSaveError("Enter a base URL starting with http:// or https://.");
        return;
      }

      if (!aiModel.trim()) {
        setSaveState("error");
        setSaveError("Enter a model name.");
        return;
      }
    }

    const body: Record<string, unknown> = { aiProvider };
    if (apiKeyInput.trim()) body.aiApiKey = apiKeyInput.trim();
    if (aiProvider === "custom") {
      body.aiBaseUrl = aiBaseUrl.trim();
      body.aiModel = aiModel.trim();
    }

    const ok = await saveConfig(body);
    if (ok && apiKeyInput.trim()) {
      setHasKey(true);
      setApiKeyInput("");
    }
  }

  async function handleRemoveKey() {
    const ok = await saveConfig({ aiProvider, aiApiKey: "" });
    if (ok) {
      setHasKey(false);
      setApiKeyInput("");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 transition-colors duration-200">
        <h2 className="mb-1 text-sm font-semibold text-ink">AI Provider</h2>
        <p className="mb-4 text-xs text-ink-dim">Choose which model generates SQL and summaries for this project.</p>

        <p className="mb-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink-dim">
          Pick a provider below — Gemini, GPT-4o, Claude, or your own OpenAI-compatible endpoint via
          &quot;Custom&quot; (DeepSeek, Qwen, Mistral, OpenRouter, self-hosted Ollama/vLLM, etc.). Use the
          shared Gemini key to get started, or bring your own API key for higher limits and full control
          over your data, with no lock-in. When you ask a question, your database schema (table and column
          names) and the resulting query results are sent to the selected provider to generate SQL and a
          plain-English summary; with your own key or endpoint, that data is sent under your account&apos;s
          agreement with that provider.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["gemini", "openai", "claude", "custom"] as AiProvider[]).map((provider) => (
            <button key={provider} type="button" onClick={() => setAiProvider(provider)} className={selectorButtonClass(aiProvider === provider)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AI_PROVIDER_ICONS[provider]} alt="" className="h-4 w-4 shrink-0" />
              {AI_PROVIDER_INFO[provider].label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs text-ink-secondary">{info.note}</p>

        {aiProvider === "custom" && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {CUSTOM_PROVIDER_EXAMPLES.map((example) => (
              <span
                key={example.label}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-ink-secondary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={example.icon} alt="" className="h-3.5 w-3.5 shrink-0" />
                {example.label}
              </span>
            ))}
            <span className="text-xs text-ink-dim">+ OpenRouter, Ollama, vLLM, LM Studio…</span>
          </div>
        )}

        {info.keyUrl && (
          <a
            href={info.keyUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-4 inline-flex items-center gap-1 text-xs text-ink-secondary transition-colors duration-150 hover:text-ink hover:underline"
          >
            {info.keyUrlLabel}
            <ExternalLink size={12} strokeWidth={1.5} />
          </a>
        )}

        {aiProvider === "custom" && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ai-base-url" className="mb-1 block text-xs font-medium text-ink-secondary">
                Base URL <span className="text-error">*</span>
              </label>
              <input
                id="ai-base-url"
                type="text"
                value={aiBaseUrl}
                onChange={(event) => setAiBaseUrl(event.target.value)}
                placeholder="https://api.deepseek.com/v1"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-[13px] text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
              />
            </div>
            <div>
              <label htmlFor="ai-model" className="mb-1 block text-xs font-medium text-ink-secondary">
                Model name <span className="text-error">*</span>
              </label>
              <input
                id="ai-model"
                type="text"
                value={aiModel}
                onChange={(event) => setAiModel(event.target.value)}
                placeholder="deepseek-chat"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-[13px] text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
              />
            </div>
          </div>
        )}

        <div className="mb-2">
          <label htmlFor="ai-key" className="mb-1 block text-xs font-medium text-ink-secondary">
            API key {info.requiresKey ? <span className="text-error">*</span> : <span className="text-ink-dim">(optional)</span>}
          </label>
          <div className="relative">
            <input
              id="ai-key"
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder={hasKey ? "Key is set — enter a new key to replace it" : "sk-..."}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 pr-10 font-mono text-[13px] text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              aria-label={showKey ? "Hide API key" : "Show API key"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-dim transition-colors duration-150 hover:text-ink-secondary"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {hasKey && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-success">
                <Check size={12} strokeWidth={1.5} />
                API key is set
              </span>
              <button
                type="button"
                onClick={handleRemoveKey}
                className="text-xs text-ink-dim transition-colors duration-150 hover:text-error"
              >
                Remove key
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-all duration-150 hover:bg-accent-glow hover:shadow-glow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
          {saveState === "success" && <span className="text-xs text-success">Saved.</span>}
          {saveState === "error" && <span className="text-xs text-error">{saveError}</span>}
        </div>
      </section>
    </div>
  );
}

function SetupGuideTab() {
  return (
    <div className="space-y-4">
      {GUIDE_STEPS.map((step) => {
        const Icon = step.icon;

        return (
          <section key={step.title} className="flex gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-accent">
              <Icon size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="mb-1.5 text-sm font-semibold text-ink">{step.title}</h2>
              <p className="text-sm leading-relaxed text-ink-secondary">{step.body}</p>
            </div>
          </section>
        );
      })}
    </div>
  );
}
