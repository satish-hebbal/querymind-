import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __qmPgPool: Pool | undefined;
}

let pool: Pool | null = null;

/**
 * Lazily creates (and reuses) the Postgres connection pool. Deferring
 * creation to first call avoids reading DATABASE_URL at module-import
 * time, which fails during Next.js build/static analysis on Vercel.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = global.__qmPgPool ?? createPool();

    if (process.env.NODE_ENV !== "production") {
      global.__qmPgPool = pool;
    }
  }

  return pool;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
  });
}

export interface QueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  columns: string[];
  rowCount: number;
}

/**
 * Runs a read-only query against the database.
 * Callers are responsible for validating that `sql` is a safe SELECT statement.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const client = await getPool().connect();

  try {
    await client.query("SET statement_timeout = 10000");
    await client.query("SET default_transaction_read_only = on");

    const result = await client.query<T>(sql, params);

    return {
      rows: result.rows,
      columns: result.fields.map((field) => field.name),
      rowCount: result.rowCount ?? result.rows.length,
    };
  } finally {
    await client.query("RESET ALL").catch(() => undefined);
    client.release();
  }
}
