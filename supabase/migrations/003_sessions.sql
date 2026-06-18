-- Add sessions table and link chats to sessions

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  user_id uuid references auth.users not null,
  title text not null default 'New chat',
  created_at timestamp with time zone default now()
);

create index if not exists idx_sessions_project_id on sessions(project_id);
create index if not exists idx_sessions_user_id on sessions(user_id);

alter table sessions enable row level security;

drop policy if exists "Users own their sessions" on sessions;
create policy "Users own their sessions"
  on sessions for all using (auth.uid() = user_id);

-- Add session_id foreign key to chats
alter table chats
  add column if not exists session_id uuid references sessions on delete cascade;

create index if not exists idx_chats_session_id on chats(session_id);
