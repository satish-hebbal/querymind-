import { Pool, type QueryResultRow } from "pg";
import { describeDbError, validateConnectionString } from "./db-errors";

declare global {
  // eslint-disable-next-line no-var
  var __qmProjectPools: Map<string, Pool> | undefined;
}

function getPoolCache(): Map<string, Pool> {
  if (!global.__qmProjectPools) {
    global.__qmProjectPools = new Map();
  }
  return global.__qmProjectPools;
}

function getProjectPool(connectionString: string): Pool {
  const cache = getPoolCache();
  let pool = cache.get(connectionString);

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    cache.set(connectionString, pool);
  }

  return pool;
}

export interface ProjectQueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  columns: string[];
  rowCount: number;
}

/**
 * Runs a read-only query against an arbitrary project database.
 * Callers are responsible for validating that `sql` is a safe SELECT statement.
 */
export async function queryProjectDb<T extends QueryResultRow = QueryResultRow>(
  connectionString: string,
  sql: string,
  params: unknown[] = []
): Promise<ProjectQueryResult<T>> {
  const client = await getProjectPool(connectionString).connect();

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

export interface TestConnectionResult {
  success: boolean;
  error?: string;
}

/** Opens a short-lived connection to verify a connection string works. */
export async function testConnection(connectionString: string): Promise<TestConnectionResult> {
  const formatError = validateConnectionString(connectionString);
  if (formatError) {
    return { success: false, error: formatError };
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 8000,
  });

  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return { success: true };
    } finally {
      client.release();
    }
  } catch (error) {
    return { success: false, error: describeDbError(error, connectionString) };
  } finally {
    await pool.end().catch(() => undefined);
  }
}
