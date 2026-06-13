"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { AiProvider, DbType } from "@/types";

interface GiniContextValue {
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  projectId: string;
  dbType: DbType;
  aiProvider: AiProvider;
}

const GiniContext = createContext<GiniContextValue | null>(null);

interface GiniProviderProps {
  children: ReactNode;
  projectId?: string;
  dbType?: DbType;
  aiProvider?: AiProvider;
}

export function GiniProvider({ children, projectId = "", dbType = "postgresql", aiProvider = "gemini" }: GiniProviderProps) {
  const [isTyping, setIsTyping] = useState(false);

  return (
    <GiniContext.Provider value={{ isTyping, setIsTyping, projectId, dbType, aiProvider }}>
      {children}
    </GiniContext.Provider>
  );
}

export function useGini(): GiniContextValue {
  const ctx = useContext(GiniContext);
  return ctx ?? { isTyping: false, setIsTyping: () => {}, projectId: "", dbType: "postgresql", aiProvider: "gemini" };
}
