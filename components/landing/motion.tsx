"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** True once the element has scrolled into view (or while it is in view, when `once` is false). */
export function useInView<T extends Element>({ threshold = 0.2, once = true, rootMargin = "0px" } = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once, rootMargin]);

  return [ref, inView] as const;
}

/** Fades and lifts its children in when they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * Steps through a list of phase durations while `active`, looping by default.
 * Resets to phase 0 whenever it becomes inactive. `durations` must be stable.
 */
export function usePhase(active: boolean, durations: readonly number[], loop = true) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) setPhase(0);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (!loop && phase >= durations.length - 1) return;
    const id = setTimeout(() => setPhase((p) => (p + 1) % durations.length), durations[phase]);
    return () => clearTimeout(id);
  }, [active, phase, loop, durations]);

  return phase;
}

/** Types `text` out one character at a time while `active`. */
export function useTyped(text: string, active: boolean, speedMs = 32) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    if (count >= text.length) return;
    const id = setTimeout(() => setCount((c) => c + 1), speedMs);
    return () => clearTimeout(id);
  }, [active, count, text, speedMs]);

  return { typed: text.slice(0, count), done: count >= text.length };
}

/** False on the first paint, true right after, so CSS transitions play on mount. */
export function useEntered() {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 40);
    return () => clearTimeout(id);
  }, []);
  return entered;
}

/** Eases a number from 0 up to `target` once `active`. */
export function useCountUp(target: number, active = true, durationMs = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / durationMs);
      setValue(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);

  return value;
}

/** Indian-style compact rupee formatting, matching how the app formatted money. */
export function inr(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}
