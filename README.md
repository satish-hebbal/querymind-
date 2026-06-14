# Datagini

**Talk to your database in plain English.**

Datagini lets you connect a database and ask it questions the way you'd ask
a person — *"How many orders did we get last month?"*, *"Who are my top 10
customers?"* — and get back a plain-English answer, a table, and a chart.
No SQL knowledge required.

This README is written so that **anyone**, not just developers, can
understand what Datagini does with your data and how it's kept safe. If
you're here to run the project locally, jump to
[For developers](#for-developers).

## What does Datagini actually do?

1. You connect a database — your shop's database, your company's database,
   anything running PostgreSQL.
2. You type a question in normal English.
3. An AI assistant (your choice of model) turns that question into a
   database query behind the scenes.
4. Datagini runs that query and shows you the answer as a sentence, a
   table, and — where it makes sense — a chart.
5. A **DB Visualizer** lets you see your database's tables and how they
   connect to each other, like a map.

That's the whole product. Everything below explains *how* it does this
safely.

## Your data & privacy — the important part

If we were handing our company's database to an app, this is the section
we'd want explained clearly. Please read it before connecting anything
important.

### 1. Your database connection (the "DB URL")

When you connect a database, you paste in a **connection string** — one
line of text containing your database's address plus a username and
password, e.g. `postgresql://user:password@host:5432/mydb`. Think of it as
the key to your database's front door.

Here's exactly what happens to it:

- **It's scrambled before it's saved.** The moment you save it, Datagini
  encrypts it using **AES-256-GCM** — the same class of encryption used by
  password managers and banking apps. What actually sits in storage is
  unreadable gibberish without a secret key that only the server holds.
- **You never see it again in full.** The Config page only ever shows a
  masked version, like `••••••••••••••@db.example.com:5432/mydb` — enough
  to recognize it, not enough to use it.
- **It's decrypted only in server memory, for a split second.** When you ask
  a question, the server briefly decrypts the connection string just long
  enough to run your query, then discards it. It is never sent to your
  browser, never logged, and never visible to us.
- **You can change or remove it at any time** from the project's Config
  page.

### 2. What gets sent to the AI (and what never does)

To turn your question into a query, the AI provider you choose (Gemini,
GPT-4o, Claude, or a custom model) needs to know the *shape* of your
database — table names, column names, and data types. For example, it
learns there's an `orders` table with `id`, `customer_id`, and `total`
columns, but not what's actually inside those rows.

- **To generate the query**: only this structure (table/column names and
  types) is sent — never your actual data, and never your connection string
  or passwords.
- **To write the plain-English answer**: a small sample of the *results* of
  your specific question (up to 10 rows) is sent, so the AI can describe
  them in a sentence. This is only ever the data relevant to the question
  you just asked — not a dump of your whole database.
- **Your connection string, AI API keys, and any other secrets are never
  sent to the AI** — period.

### 3. Datagini can only *read* — it can never change your data

Even if something went wrong with the AI, Datagini is built so it cannot
modify your database:

- The AI is instructed to write only `SELECT` (read) queries — never
  `INSERT`, `UPDATE`, `DELETE`, or anything that changes data.
- Before running, every generated query is checked against a blocklist of
  dangerous keywords (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`,
  `TRUNCATE`, `GRANT`, and more). If any appear, the query is rejected and
  never runs.
- As a final safety net, every query runs inside a **read-only database
  transaction** with a 10-second time limit — so even a query that somehow
  slipped through could not change anything, and can't run forever.

### 4. Your projects are private to you

Datagini is multi-user — many people can use the same app, each with their
own connected databases. Every project and chat history is tied to your
account, and **Row Level Security** — enforced by the database itself, not
just the app's code — guarantees that no query, not even a buggy one, can
ever return another user's data. You only ever see your own projects and
conversations.

### 5. Your AI provider keys are protected the same way

If you choose to use your own OpenAI, Claude, or other API key (instead of
the free shared Gemini key), it's encrypted with the same AES-256-GCM method
as your database connection string and shown back to you masked.

## Choosing an AI "brain"

Datagini can use different AI models to turn your questions into queries:

- **Gemini** *(default)* — works out of the box with no setup, using a
  shared free key.
- **GPT-4o (OpenAI)** — bring your own OpenAI API key.
- **Claude (Anthropic)** — bring your own Anthropic API key.
- **Custom** — point Datagini at any OpenAI-compatible API: DeepSeek, Qwen,
  Mistral, OpenRouter, or a self-hosted model server (Ollama, vLLM, LM
  Studio, etc). Just provide a base URL and model name, plus an API key if
  the endpoint needs one.

You can switch providers and keys at any time from a project's
**Config → AI Model** tab.

---

## For developers

Everything below is for running Datagini locally. For the visual design
system (colors, typography, components, animations), see
[DESIGN.md](DESIGN.md).

### Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS, with a dark theme by
  default and a light theme toggle
- Supabase Auth (email/password, magic link, Google OAuth) + Postgres for
  app data (`projects`, `chats`) with Row Level Security
- `pg` for connecting to each project's own PostgreSQL database
- Multi-model AI: Gemini (`@google/generative-ai`, default), OpenAI
  (`openai`), Claude (`@anthropic-ai/sdk`), and any OpenAI-compatible
  "Custom" endpoint via `openai`
- Recharts for chart rendering
- `@xyflow/react` (React Flow) + `dagre` for the DB Visualizer

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

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

### 3. Run the database migrations

Open the Supabase SQL editor for your project and run these, in order:

1. [`supabase/migrations/001_projects.sql`](supabase/migrations/001_projects.sql)
   — creates the core tables:
   - `projects` — one row per connected database (encrypted connection
     string, DB type, AI provider, encrypted AI API key), owned by
     `auth.users`
   - `chats` — chat history per project (question, generated SQL, result
     JSON)

   Both tables have Row Level Security enabled so each user can only see
   their own projects and chats.

2. [`supabase/migrations/002_custom_ai_provider.sql`](supabase/migrations/002_custom_ai_provider.sql)
   — adds `ai_base_url` and `ai_model` columns to `projects`, needed for the
   "Custom" AI provider option.

Both scripts are idempotent and safe to re-run.

### 4. Enable auth providers (Supabase dashboard)

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

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to
`/auth/login` — sign up, then you'll land on `/dashboard`.

### Adding a new database (project)

1. From the dashboard, click **+ New Project**.
2. Give it a name and paste a PostgreSQL connection string (e.g. from
   Supabase, Neon, Railway, Render, or your own server). Click **Test
   connection** to verify Datagini can reach it.
3. Pick a database type and an AI provider. Gemini works out of the box
   using the shared `GEMINI_API_KEY`; OpenAI, Claude, and Custom require you
   to provide your own credentials.
4. Click **Create**. You'll be taken into the project, where you can:
   - **Chat** — ask questions in plain English
   - **DB Visualizer** — see your schema as an interactive diagram, with
     tables, columns, primary/foreign keys, and relationships
   - **Config** — update the connection, switch AI providers/keys, view the
     setup guide, or delete the project

### How a query works, technically

1. The chat UI sends `{ projectId, question }` to `POST /api/query`.
2. The API loads (and caches) the target database's schema from
   `information_schema`.
3. The selected AI provider converts the question + schema into a single
   read-only `SELECT` statement.
4. The SQL is validated (must be a single `SELECT` statement with no
   forbidden keywords) before being executed against the project's database
   in a read-only transaction with a statement timeout.
5. Results are returned and rendered as a chart, table, or summary, and the
   question/SQL/results are saved to the `chats` table for history.

### Security implementation reference

| Concern | Where it lives |
| --- | --- |
| Encrypting/decrypting `db_url` and `ai_api_key` | [`lib/encrypt.ts`](lib/encrypt.ts) (AES-256-GCM via `ENCRYPTION_KEY`) |
| Masking connection strings/keys for display | `mask()` in [`lib/encrypt.ts`](lib/encrypt.ts) |
| SQL keyword blocklist + single-statement check | `validateSql()` in [`lib/ai.ts`](lib/ai.ts) |
| Read-only transaction + statement timeout | [`lib/project-db.ts`](lib/project-db.ts) |
| Per-user data isolation | RLS policies in [`supabase/migrations/001_projects.sql`](supabase/migrations/001_projects.sql) |

### Project structure

```
app/
  page.tsx                        Redirects to /dashboard or /auth/login
  layout.tsx                      Root layout + fonts + theme script
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
  project-db.ts                   Per-project Postgres pool + read-only queries
  schema.ts                       Schema introspection (cached, plain + structured)
  ai.ts                           Multi-provider SQL/summary generation + SQL validation
  encrypt.ts                      AES-256-GCM encryption + masking
  provider-meta.ts                AI/DB provider labels and icons
  db-errors.ts                    Plain-language error messages
middleware.ts                     Auth-aware route protection
supabase/migrations/
  001_projects.sql                projects + chats tables, RLS
  002_custom_ai_provider.sql      ai_base_url / ai_model columns for Custom AI provider
```
