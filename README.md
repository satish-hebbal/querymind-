# Datagini

Datagini is a natural-language BI tool for an event management company. Ask
questions in plain English about events, clients, and bookings — Datagini
converts them to SQL with Gemini, runs them against your Postgres database,
and renders the results as a chart, table, or big number.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (dark theme)
- `pg` for direct PostgreSQL access (Supabase Postgres)
- `@google/generative-ai` (Gemini 1.5 Flash) for NL → SQL
- Recharts for chart rendering

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

A `.env.local` file with working credentials is already included for local
development. If you need to point at your own Supabase project, copy
`.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | Direct Postgres connection string used by `pg` |
| `GEMINI_API_KEY` | Google Gemini API key (Gemini 1.5 Flash) |

### 3. Set up the database

Open the Supabase SQL editor for your project and run the contents of
[`supabase/seed.sql`](supabase/seed.sql). This will:

- Create the `clients`, `events`, and `bookings` tables
- Seed 10 Indian clients, 25 events (2024–2025), and 40 bookings

The script is idempotent — it drops and recreates the tables, so it's safe
to re-run.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start asking
questions, e.g.:

- "Which events made the most revenue?"
- "Show monthly revenue for 2024"
- "How many tickets sold per city?"
- "Which clients have the most bookings?"
- "Show all upcoming events"

## How it works

1. The chat UI sends the question to `POST /api/query`.
2. The API loads (and caches) the database schema from
   `information_schema`.
3. Gemini 1.5 Flash converts the question + schema into a single read-only
   `SELECT` statement.
4. The SQL is validated (must start with `SELECT`, no dangerous keywords,
   single statement) before being executed against Postgres in a read-only
   transaction.
5. Results are returned to the client and rendered as a line chart, bar
   chart, big-number card, or table — whichever best fits the shape of the
   data.

## Project structure

```
app/
  page.tsx              Main chat page
  layout.tsx            Root layout + Inter font
  api/query/route.ts    NL -> SQL -> results API route
components/
  ChatWindow.tsx         Chat history, results, SQL viewer
  ChatInput.tsx          Message input box
  ResultTable.tsx        Table view for query results
  ResultChart.tsx         Chart auto-detection + rendering
lib/
  db.ts                  Postgres connection pool + query helper
  schema.ts              Schema introspection (cached)
  gemini.ts              Gemini prompt, SQL cleaning + validation
types/index.ts           Shared TypeScript types
supabase/seed.sql        Database schema + seed data
```

## Security notes

- Database and Gemini calls only happen server-side in API routes; secrets
  are never sent to the client.
- Generated SQL must be a single `SELECT` statement and is checked against a
  list of forbidden keywords before execution.
- Queries run in a read-only transaction with a statement timeout.
