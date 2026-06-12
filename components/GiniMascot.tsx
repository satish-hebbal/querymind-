"use client";

import { useEffect, useState } from "react";

const FRAME_MS = 150;

const TYPING_FRAMES = [
  "/animation-frames/gini-a1-f1.svg",
  "/animation-frames/gini-a1-f2.svg",
  "/animation-frames/gini-a1-f3.svg",
  "/animation-frames/gini-a1-f4.svg",
];

const HOVER_FRAMES = [
  "/animation-frames/gini-a2-f1.svg",
  "/animation-frames/gini-a2-f2.svg",
  "/animation-frames/gini-a2-f3.svg",
  "/animation-frames/gini-a2-f4.svg",
];

const IDLE_FRAME = TYPING_FRAMES[0];

interface GiniMascotProps {
  /** Plays the A1 frame sequence on a loop, e.g. while the user is typing. */
  typing?: boolean;
  size?: number;
  className?: string;
}

export default function GiniMascot({ typing = false, size = 20, className = "" }: GiniMascotProps) {
  const [hovering, setHovering] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    [...TYPING_FRAMES, ...HOVER_FRAMES].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const animating = typing || hovering;
  const frames = typing ? TYPING_FRAMES : HOVER_FRAMES;

  useEffect(() => {
    if (!animating) {
      setFrameIndex(0);
      return;
    }

    const id = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, FRAME_MS);

    return () => clearInterval(id);
  }, [animating, frames]);

  const src = animating ? frames[frameIndex % frames.length] : IDLE_FRAME;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Gini"
      width={size}
      height={size}
      draggable={false}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`select-none object-contain ${className}`}
    />
  );
}
