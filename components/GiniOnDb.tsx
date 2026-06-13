"use client";

import { useEffect, useState } from "react";

const FRAME_MS = 150;
const LOOP_GAP_MS = 2000;

const FRAMES = [
  "/animation-frames/gini-on-db-f1.svg",
  "/animation-frames/gini-on-db-f2.png",
  "/animation-frames/gini-on-db-f3.png",
];

// f1 -> f2 -> f3 -> f2 -> f1, then a pause before repeating.
const SEQUENCE = [0, 1, 2, 1, 0];

export default function GiniOnDb({ className = "" }: { className?: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const isLastStep = step === SEQUENCE.length - 1;
    const delay = isLastStep ? LOOP_GAP_MS : FRAME_MS;

    const id = setTimeout(() => {
      setStep((prev) => (prev + 1) % SEQUENCE.length);
    }, delay);

    return () => clearTimeout(id);
  }, [step]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={FRAMES[SEQUENCE[step]]} alt="" draggable={false} className={`select-none object-contain ${className}`} />
  );
}
