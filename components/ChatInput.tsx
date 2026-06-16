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
    <form onSubmit={handleFormSubmit} className="bg-bg px-4 pb-0 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-t-2xl border border-b-0 border-border px-4 pt-3 pb-2">
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
          <Link
            href={`/project/${projectId}/config?tab=database`}
            className="flex items-center gap-1.5 text-[11px] text-ink-dim transition-colors duration-150 hover:text-ink-secondary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DB_TYPE_ICONS[dbType]} alt="" className="h-3.5 w-3.5" />
            {DB_TYPE_LABELS[dbType]}
          </Link>
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
