"use client";

import { AreaChart, BarChart3, Check, ChevronDown, Grid3x3, Layers, LayoutGrid, LineChart, PieChart, Send, Sparkles, Table2, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useGini } from "@/lib/gini-context";
import { AI_PROVIDER_ICONS, AI_PROVIDER_LABELS, DB_TYPE_ICONS, DB_TYPE_LABELS } from "@/lib/provider-meta";
import { FORCED_VIZ_OPTIONS, type ForcedViz } from "@/lib/viz-spec";

const TYPING_IDLE_MS = 600;

const VIZ_ICONS: Record<ForcedViz, typeof Sparkles> = {
  auto: Sparkles,
  leaderboard: Trophy,
  bar: BarChart3,
  line: LineChart,
  area: AreaChart,
  pie: PieChart,
  breakdown: PieChart,
  stacked: Layers,
  bullet: Target,
  heatmap: Grid3x3,
  comparison: BarChart3,
  cards: LayoutGrid,
  kpi: BarChart3,
  table: Table2,
};

interface ChatInputProps {
  onSubmit: (question: string, vizType?: string) => void;
  disabled?: boolean;
  prefill?: string;
}

export default function ChatInput({ onSubmit, disabled, prefill }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [vizType, setVizType] = useState<ForcedViz>("auto");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setIsTyping, projectId, dbType, aiProvider } = useGini();

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setIsTyping(false);
    };
  }, [setIsTyping]);

  useEffect(() => {
    if (!prefill) return;

    setValue(prefill);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [prefill]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSubmit(trimmed, vizType);
    setValue("");

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleTyping() {
    setIsTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), TYPING_IDLE_MS);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleInput(event: FormEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
  }

  return (
    <form onSubmit={handleFormSubmit} className="bg-bg px-4 pb-0 sm:px-8 lg:px-12">
      <div className="w-full rounded-t-2xl border border-b-0 border-border px-4 pt-3 pb-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder="Ask your database anything..."
          rows={1}
          className="max-h-40 w-full resize-none bg-transparent px-0 py-1 text-sm text-ink placeholder-ink-dim focus:outline-none disabled:opacity-50"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={`/project/${projectId}/config?tab=database`}
              className="flex items-center gap-1.5 text-[11px] text-ink-dim transition-colors duration-150 hover:text-ink-secondary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DB_TYPE_ICONS[dbType]} alt="" className="h-3.5 w-3.5" />
              {DB_TYPE_LABELS[dbType]}
            </Link>
            <VizPicker value={vizType} onChange={setVizType} disabled={disabled} />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/project/${projectId}/config?tab=ai`}
              className="flex items-center gap-1.5 text-[11px] text-ink-dim transition-colors duration-150 hover:text-ink-secondary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AI_PROVIDER_ICONS[aiProvider]} alt="" className="h-3.5 w-3.5" />
              {AI_PROVIDER_LABELS[aiProvider]}
            </Link>
            <button
              type="submit"
              disabled={disabled || !value.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-bg shadow-accent-inset transition-all duration-150 hover:bg-accent-glow active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function VizPicker({
  value,
  onChange,
  disabled,
}: {
  value: ForcedViz;
  onChange: (v: ForcedViz) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const current = FORCED_VIZ_OPTIONS.find((o) => o.value === value) ?? FORCED_VIZ_OPTIONS[0];
  const CurrentIcon = VIZ_ICONS[value] ?? Sparkles;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-ink-secondary transition-colors duration-150 hover:border-border-bright hover:text-ink disabled:opacity-50"
        title="Choose how the answer is visualized"
      >
        <CurrentIcon size={13} strokeWidth={1.5} />
        {current.label}
        <ChevronDown size={12} strokeWidth={1.5} className="text-ink-dim" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1.5 max-h-72 w-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-glow-md">
          {FORCED_VIZ_OPTIONS.map((opt) => {
            const Icon = VIZ_ICONS[opt.value] ?? Sparkles;
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 hover:bg-elevated ${
                  active ? "bg-elevated" : ""
                }`}
              >
                <Icon size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink-secondary" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
                    {opt.label}
                    {active && <Check size={12} strokeWidth={2} className="text-accent" />}
                  </span>
                  <span className="block truncate text-[11px] text-ink-dim">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
