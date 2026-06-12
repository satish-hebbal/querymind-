import { query } from "./db";

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
}

let cachedSchema: string | null = null;

/**
 * Builds a human-readable description of the public schema by querying
 * information_schema. The result is cached in memory for the lifetime of
 * the server process.
 */
export async function getSchema(): Promise<string> {
  if (cachedSchema) {
    return cachedSchema;
  }

  const { rows } = await query<ColumnRow>(
    `select c.table_name, c.column_name, c.data_type
     from information_schema.columns c
     join information_schema.tables t
       on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and t.table_type = 'BASE TABLE'
     order by c.table_name, c.ordinal_position`
  );

  const tables = new Map<string, string[]>();

  for (const row of rows) {
    const columns = tables.get(row.table_name) ?? [];
    columns.push(`${row.column_name} ${row.data_type}`);
    tables.set(row.table_name, columns);
  }

  const lines: string[] = [];

  for (const [tableName, columns] of tables) {
    lines.push(`Table ${tableName} (${columns.join(", ")})`);
  }

  cachedSchema = lines.join("\n");
  return cachedSchema;
}

/** Clears the in-memory schema cache, forcing the next call to re-fetch. */
export function clearSchemaCache(): void {
  cachedSchema = null;
}
