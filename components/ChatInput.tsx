"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useGini } from "@/lib/gini-context";
import { AI_PROVIDER_ICONS, AI_PROVIDER_LABELS, DB_TYPE_ICONS, DB_TYPE_LABELS } from "@/lib/provider-meta";

const TYPING_IDLE_MS = 600;

interface ChatInputProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  prefill?: string;
}

export default function ChatInput({ onSubmit, disabled, prefill }: ChatInputProps) {
  const [value, setValue] = useState("");
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

    onSubmit(trimmed);
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
    <form onSubmit={handleFormSubmit} className="border-t border-border bg-bg px-4 py-3 sm:px-6">
      <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between text-[11px] text-ink-dim">
        <Link
          href={`/project/${projectId}/config?tab=database`}
          className="flex items-center gap-1.5 transition-colors duration-150 hover:text-ink-secondary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DB_TYPE_ICONS[dbType]} alt="" className="h-3.5 w-3.5" />
          {DB_TYPE_LABELS[dbType]}
        </Link>
        <Link
          href={`/project/${projectId}/config?tab=ai`}
          className="flex items-center gap-1.5 transition-colors duration-150 hover:text-ink-secondary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AI_PROVIDER_ICONS[aiProvider]} alt="" className="h-3.5 w-3.5" />
          {AI_PROVIDER_LABELS[aiProvider]}
        </Link>
      </div>
      <div className="mx-auto flex max-w-3xl items-end gap-2">
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
          className="max-h-40 flex-1 resize-none rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-accent text-bg shadow-accent-inset transition-all duration-150 hover:bg-accent-glow active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <Send size={18} strokeWidth={1.5} />
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-ink-dim">
        Enter to send · Shift+Enter for a new line
      </p>
    </form>
  );
}
