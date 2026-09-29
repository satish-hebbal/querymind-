"use client";

import type { CSSProperties } from "react";
import GiniMascot from "@/components/GiniMascot";

const INNER = [
  { src: "/model-icons/openai-icon.svg", alt: "OpenAI" },
  { src: "/model-icons/claude-icon.svg", alt: "Claude" },
  { src: "/model-icons/gemini-icon.svg", alt: "Gemini" },
];

const OUTER = [
  { src: "/model-icons/kimi-ai-icon.svg", alt: "Kimi" },
  { src: "/model-icons/meta-llama-icon.svg", alt: "Llama" },
  { src: "/model-icons/mistral-ai-icon.svg", alt: "Mistral" },
  { src: "/model-icons/deepseek-logo-icon.svg", alt: "DeepSeek" },
  { src: "/model-icons/qwen-ai-icon.svg", alt: "Qwen" },
  { src: "/model-icons/custom-icon.svg", alt: "Any OpenAI-compatible endpoint" },
];

function Ring({
  icons,
  radius,
  duration,
  reverse = false,
}: {
  icons: { src: string; alt: string }[];
  radius: number;
  duration: number;
  reverse?: boolean;
}) {
  const style = { "--orbit-duration": `${duration}s`, animationDirection: reverse ? "reverse" : "normal" } as CSSProperties;
  return (
    <>
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-border"
        style={{ width: radius * 2, height: radius * 2 }}
      />
      <div className="orbit absolute left-1/2 top-1/2 h-0 w-0" style={style}>
        {icons.map((icon, i) => {
          const angle = (i / icons.length) * 360;
          return (
            <div
              key={icon.alt}
              className="absolute left-0 top-0"
              style={{ transform: `rotate(${angle}deg) translateX(${radius}px) rotate(${-angle}deg)` }}
            >
              <div className="orbit-counter" style={style}>
                <div
                  title={icon.alt}
                  className="-ml-5 -mt-5 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-glow-sm transition-transform duration-300 hover:scale-110 hover:border-border-bright"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={icon.src} alt={icon.alt} className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function ProviderOrbit() {
  return (
    <div className="relative mx-auto h-[340px] w-[340px] scale-[0.82] sm:scale-100">
      {/* Ripples sit behind the rings so they pass under the orbiting icons. */}
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2">
        {[0, 0.9, 1.8].map((delay) => (
          <span
            key={delay}
            className="ripple-ring absolute inset-0 rounded-full border border-accent/50"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
      <Ring icons={OUTER} radius={155} duration={60} reverse />
      <Ring icons={INNER} radius={92} duration={40} />
      <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border-bright bg-card shadow-glow-lg">
        <GiniMascot size={48} />
      </div>
    </div>
  );
}
