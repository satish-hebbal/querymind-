# Datagini

**Talk to your database.**

Datagini is a multi-user SaaS app for natural-language database
exploration. Sign in, connect any PostgreSQL database, and ask questions in
plain English — Datagini converts them to SQL with your choice of AI model,
runs them read-only against your database, and renders the results as a
chart, table, or summary. A built-in DB Visualizer lets you explore your
schema visually, with tables, columns, keys, and relationships.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS (dark theme)
- Supabase Auth (email/password, magic link, Google OAuth) + Postgres for
  app data (`projects`, `chats`) with Row Level Security
- `pg` for connecting to each project's own PostgreSQL database
- Multi-model AI: Gemini (`@google/generative-ai`, default), OpenAI
  (`openai`), Claude (`@anthropic-ai/sdk`)
- Recharts for chart rendering
- `@xyflow/react` (React Flow) + `dagre` for the DB Visualizer

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

A `.env.local` file with working credentials is already included for local
development. To point at your own Supabase project, copy `.env.example` to
`.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | Direct connection string to your Supabase Postgres (handy as a sample database for your first project) |
| `GEMINI_API_KEY` | Google Gemini API key — used as the default/shared key for the Gemini provider |
| `ENCRYPTION_KEY` | Random 32+ character string used to encrypt stored DB connection strings and AI API keys. **Keep this secret** — changing it makes existing encrypted values unreadable |
| `NEXT_PUBLIC_SITE_URL` | Base URL of the app (`http://localhost:3000` locally), used to build OAuth and magic-link redirect URLs |

## 3. Run the database migration

Open the Supabase SQL editor for your project and run
[`supabase/migrations/001_projects.sql`](supabase/migrations/001_projects.sql).
This creates:

- `projects` — one row per connected database (encrypted connection string,
  DB type, AI provider, encrypted AI API key), owned by `auth.users`
- `chats` — chat history per project (question, generated SQL, result JSON)

Both tables have Row Level Security enabled so each user can only see their
own projects and chats. The script is idempotent and safe to re-run.

## 4. Enable auth providers (Supabase dashboard)

Email/password and magic-link sign-in work out of the box. To enable
**Google sign-in**:

1. In the [Google Cloud Console](https://console.cloud.google.com/), create
   an OAuth 2.0 Client ID (Web application).
2. Add an authorized redirect URI pointing at your Supabase project:
   `https://<your-project>.supabase.co/auth/v1/callback`.
3. In your Supabase dashboard, go to **Authentication → Providers →
   Google**, enable it, and paste in the Client ID and Client Secret.
4. Make sure `NEXT_PUBLIC_SITE_URL` is set correctly — Datagini uses it to
   build the `/auth/callback` redirect URL after sign-in.

## 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to
`/auth/login` — sign up, then you'll land on `/dashboard`.

## Adding a new database (project)

1. From the dashboard, click **+ New Project**.
2. Give it a name and paste a PostgreSQL connection string (e.g. from
   Supabase, Neon, Railway, Render, or your own server). Click **Test
   connection** to verify Datagini can reach it.
3. Pick a database type and an AI provider. Gemini works out of the box
   using the shared `GEMINI_API_KEY`; OpenAI and Claude require you to paste
   your own API key.
4. Click **Create**. You'll be taken into the project, where you can:
   - **Chat** — ask questions in plain English
   - **DB Visualizer** — see your schema as an interactive diagram, with
     tables, columns, primary/foreign keys, and relationships
   - **Config** — update the connection, switch AI providers/keys, view the
     setup guide, or delete the project

Connection strings and AI API keys are encrypted (AES-256-GCM) before being
stored and are never sent back to the browser in full.

## How a query works

1. The chat UI sends `{ projectId, question }` to `POST /api/query`.
2. The API loads (and caches) the target database's schema from
   `information_schema`.
3. The selected AI provider converts the question + schema into a single
   read-only `SELECT` statement.
4. The SQL is validated (must start with `SELECT`, no forbidden keywords,
   single statement) before being executed against the project's database
   in a read-only transaction with a statement timeout.
5. Results are returned and rendered as a chart, table, or summary, and the
   question/SQL/results are saved to the `chats` table for history.

## Project structure

```
app/
  page.tsx                        Redirects to /dashboard or /auth/login
  layout.tsx                      Root layout + Inter font
  auth/login/page.tsx             Sign in / sign up / magic link / Google
  auth/callback/route.ts          OAuth + magic-link callback
  auth/reset-password/page.tsx    Password reset
  dashboard/page.tsx              Project list + new project modal
  project/[id]/layout.tsx          Project shell + sidebar
  project/[id]/chat/page.tsx       Chat + history
  project/[id]/visualizer/page.tsx DB Visualizer (React Flow)
  project/[id]/config/page.tsx     Database / AI Model / Setup Guide tabs
  api/projects/...                Project CRUD, test connection, chats, table info
  api/query/route.ts              NL -> SQL -> results
  api/schema/[projectId]/route.ts Structured schema for the visualizer
components/
  dashboard/DashboardClient.tsx   Dashboard, project cards, new project modal
  project/ProjectShell.tsx        Sidebar + project layout shell
  project/ChatClient.tsx          Chat UI + history panel
  project/ConfigClient.tsx        Config page tabs
  visualizer/VisualizerClient.tsx React Flow schema diagram + table detail panel
  ChatWindow.tsx / ChatInput.tsx  Shared chat components
  ResultTable.tsx / ResultChart.tsx Result rendering
lib/
  supabase/client.ts, server.ts   Supabase Auth clients
  project-db.ts                   Per-project Postgres pool + queries
  schema.ts                       Schema introspection (cached, plain + structured)
  ai.ts                           Multi-provider SQL/summary generation
  encrypt.ts                      AES-256-GCM encryption + masking
middleware.ts                     Auth-aware route protection
supabase/migrations/001_projects.sql  projects + chats tables, RLS
```

## Security notes

- All database and AI calls happen server-side; secrets are never sent to
  the client. The config page only ever shows masked connection strings.
- `db_url` and `ai_api_key` are stored encrypted (AES-256-GCM) using
  `ENCRYPTION_KEY`.
- Row Level Security on `projects` and `chats` ensures users can only access
  their own data.
- Generated SQL must be a single `SELECT` statement and is checked against a
  list of forbidden keywords before execution.
- Queries run in a read-only transaction with a statement timeout against
  the target project's database.
