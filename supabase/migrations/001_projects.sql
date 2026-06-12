-- Datagini SaaS migration: multi-project support
-- Run this in the Supabase SQL editor for your project.

create extension if not exists pgcrypto;

-- ============================================================
-- Tables
-- ============================================================

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  db_url text not null,
  db_type text not null default 'postgresql',
  ai_provider text not null default 'gemini',
  ai_api_key text,
  created_at timestamp with time zone default now()
);

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  user_id uuid references auth.users not null,
  question text not null,
  sql_generated text,
  result_json jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_chats_project_id on chats(project_id);
create index if not exists idx_chats_user_id on chats(user_id);
create index if not exists idx_projects_user_id on projects(user_id);

-- ============================================================
-- Row level security
-- ============================================================

alter table projects enable row level security;
alter table chats enable row level security;

drop policy if exists "Users own their projects" on projects;
create policy "Users own their projects"
  on projects for all using (auth.uid() = user_id);

drop policy if exists "Users own their chats" on chats;
create policy "Users own their chats"
  on chats for all using (auth.uid() = user_id);
