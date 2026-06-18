import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { AiProvider } from "@/types";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";
const OPENAI_MODEL = "gpt-4o";
const GEMINI_MODEL = "gemini-2.5-flash";
const CLAUDE_MODEL = "claude-3-5-haiku-20241022";

export function resolveModel(
  provider: AiProvider,
  apiKey: string,
  baseUrl?: string | null,
  modelName?: string | null
): LanguageModel {
  switch (provider) {
    case "nvidia": {
      const p = createOpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });
      return p(NVIDIA_MODEL);
    }
    case "openai": {
      const p = createOpenAI({ apiKey });
      return p(OPENAI_MODEL);
    }
    case "gemini": {
      const p = createGoogleGenerativeAI({ apiKey });
      return p(GEMINI_MODEL);
    }
    case "claude": {
      const p = createAnthropic({ apiKey });
      return p(CLAUDE_MODEL);
    }
    case "custom": {
      if (!baseUrl) throw new Error("No base URL configured for the custom provider.");
      if (!modelName) throw new Error("No model name configured for the custom provider.");
      const p = createOpenAI({ apiKey, baseURL: baseUrl });
      return p(modelName);
    }
  }
}

export function resolveApiKeyForProvider(provider: AiProvider, apiKey?: string | null): string {
  if (apiKey) return apiKey;
  if (provider === "nvidia" && process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;
  if (provider === "gemini" && process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (provider === "custom") return "not-needed";
  throw new Error(`No API key configured for ${provider}.`);
}
