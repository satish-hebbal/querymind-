"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface GiniContextValue {
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
}

const GiniContext = createContext<GiniContextValue | null>(null);

export function GiniProvider({ children }: { children: ReactNode }) {
  const [isTyping, setIsTyping] = useState(false);

  return <GiniContext.Provider value={{ isTyping, setIsTyping }}>{children}</GiniContext.Provider>;
}

export function useGini(): GiniContextValue {
  const ctx = useContext(GiniContext);
  return ctx ?? { isTyping: false, setIsTyping: () => {} };
}
