"use client";

import { Send } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSubmit, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSubmit(trimmed);
    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder="Ask your event data anything..."
          rows={1}
          className="max-h-40 flex-1 resize-none rounded-lg border border-border bg-surface px-4 py-3 text-sm text-gray-100 placeholder-gray-500 transition focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-gray-500">
        Enter to send · Shift+Enter for a new line
      </p>
    </form>
  );
}
