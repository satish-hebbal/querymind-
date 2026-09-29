"use client";

import { useEffect, useState } from "react";
import AnsiText from "@/components/landing/AnsiText";

const WORDS = ["leaderboard", "heatmap", "trend line", "donut chart", "KPI tile", "bar chart", "table"];

/** Types a word out, holds it, deletes it, then moves to the next, like a terminal prompt. */
function useTypeCycle(words: string[]) {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(words[0].length);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const word = words[index];
    let delay = deleting ? 45 : 85;
    if (!deleting && count === word.length) delay = 1800;
    if (deleting && count === 0) delay = 250;

    const id = setTimeout(() => {
      if (!deleting && count === word.length) setDeleting(true);
      else if (deleting && count === 0) {
        setDeleting(false);
        setIndex((i) => (i + 1) % words.length);
      } else setCount((c) => c + (deleting ? -1 : 1));
    }, delay);
    return () => clearTimeout(id);
  }, [words, index, count, deleting]);

  return words[index].slice(0, count);
}

export default function HeroHeadline() {
  const typed = useTypeCycle(WORDS);

  return (
    <h1 className="rise-in mt-9 flex w-full flex-col items-center">
      <span className="sr-only">Ask your database anything. Get back a chart.</span>
      <AnsiText
        lines={["ASK YOUR", "DATABASE", "ANYTHING."]}
        className="h-auto w-full max-w-[21rem] drop-shadow-[0_0_24px_rgb(var(--accent-green)/0.12)] sm:max-w-[34rem]"
      />
      <span aria-hidden="true" className="mt-7 min-w-[24ch] text-left font-mono text-lg text-ink-tertiary sm:text-2xl">
        <span className="text-accent">&gt;</span> get back a <span className="text-ink">{typed}</span>
        <span className="blink-cursor ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] bg-accent" />
      </span>
    </h1>
  );
}
