-- Datagini migration: support a "custom" AI provider (any OpenAI-compatible
-- endpoint — DeepSeek, Qwen, Mistral, OpenRouter, self-hosted Ollama/vLLM, etc.)
-- Run this in the Supabase SQL editor for your project.

alter table projects add column if not exists ai_base_url text;
alter table projects add column if not exists ai_model text;
