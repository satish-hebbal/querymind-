"use client";

import { useEffect, useState } from "react";

const FRAME_MS = 150;

const FRAMES = [
  "/animation-frames/gini-a1-f1.svg",
  "/animation-frames/gini-a1-f2.svg",
  "/animation-frames/gini-a1-f3.svg",
  "/animation-frames/gini-a1-f4.svg",
];

interface PixelLoaderProps {
  size?: number;
  label?: string;
  className?: string;
}

export default function PixelLoader({ size = 56, label, className = "" }: PixelLoaderProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % FRAMES.length);
    }, FRAME_MS);

    return () => clearInterval(id);
  }, []);

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={FRAMES[frameIndex]}
        alt="Loading"
        width={size}
        height={size}
        draggable={false}
        style={{ imageRendering: "pixelated" }}
        className="select-none object-contain"
      />
      {label && (
        <span className="flex items-center gap-1.5 text-sm text-ink-secondary">
          {label}
          <span className="flex items-center gap-1">
            <span className="pulse-dot h-1 w-1 rounded-full bg-ink-dim" style={{ animationDelay: "0ms" }} />
            <span className="pulse-dot h-1 w-1 rounded-full bg-ink-dim" style={{ animationDelay: "200ms" }} />
            <span className="pulse-dot h-1 w-1 rounded-full bg-ink-dim" style={{ animationDelay: "400ms" }} />
          </span>
        </span>
      )}
    </div>
  );
}
