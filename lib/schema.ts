import { queryProjectDb } from "./project-db";
import type { SchemaResponse, SchemaTable } from "@/types";

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
}

interface ConstraintRow {
  table_name: string;
  column_name: string;
  constraint_type: "PRIMARY KEY" | "FOREIGN KEY";
  foreign_table: string | null;
  foreign_column: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __qmSchemaCache: Map<string, string> | undefined;
  // eslint-disable-next-line no-var
  var __qmSchemaStructCache: Map<string, SchemaResponse> | undefined;
}

function getSchemaCache(): Map<string, string> {
  if (!global.__qmSchemaCache) global.__qmSchemaCache = new Map();
  return global.__qmSchemaCache;
}

function getStructCache(): Map<string, SchemaResponse> {
  if (!global.__qmSchemaStructCache) global.__qmSchemaStructCache = new Map();
  return global.__qmSchemaStructCache;
}

/**
 * Builds a human-readable description of a project's public schema for use
 * in AI prompts. Cached in memory per project for the life of the server
 * process.
 */
export async function getProjectSchema(projectId: string, dbUrl: string): Promise<string> {
  const cache = getSchemaCache();
  const cached = cache.get(projectId);
  if (cached) return cached;

  const { rows } = await queryProjectDb<ColumnRow>(
    dbUrl,
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

  const schema = lines.join("\n");
  cache.set(projectId, schema);
  return schema;
}

/**
 * Fetches the structured schema (tables, columns, primary/foreign keys) for
 * the DB visualizer. Cached in memory per project.
 */
export async function getProjectSchemaStructured(projectId: string, dbUrl: string): Promise<SchemaResponse> {
  const cache = getStructCache();
  const cached = cache.get(projectId);
  if (cached) return cached;

  const { rows: columnRows } = await queryProjectDb<ColumnRow>(
    dbUrl,
    `select c.table_name, c.column_name, c.data_type
     from information_schema.columns c
     join information_schema.tables t
       on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and t.table_type = 'BASE TABLE'
     order by c.table_name, c.ordinal_position`
  );

  const { rows: constraintRows } = await queryProjectDb<ConstraintRow>(
    dbUrl,
    `select
       tc.table_name,
       kcu.column_name,
       tc.constraint_type,
       ccu.table_name as foreign_table,
       ccu.column_name as foreign_column
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
     left join information_schema.constraint_column_usage ccu
       on tc.constraint_name = ccu.constraint_name and tc.constraint_type = 'FOREIGN KEY'
     where tc.table_schema = 'public'
       and tc.constraint_type in ('PRIMARY KEY', 'FOREIGN KEY')`
  );

  const pkSet = new Set<string>();
  const fkMap = new Map<string, { table: string; column: string }>();

  for (const row of constraintRows) {
    const key = `${row.table_name}.${row.column_name}`;

    if (row.constraint_type === "PRIMARY KEY") {
      pkSet.add(key);
    } else if (row.constraint_type === "FOREIGN KEY" && row.foreign_table && row.foreign_column) {
      fkMap.set(key, { table: row.foreign_table, column: row.foreign_column });
    }
  }

  const tableMap = new Map<string, SchemaTable>();

  for (const row of columnRows) {
    const table = tableMap.get(row.table_name) ?? { name: row.table_name, columns: [] };
    const key = `${row.table_name}.${row.column_name}`;
    const fk = fkMap.get(key);

    table.columns.push({
      name: row.column_name,
      type: row.data_type,
      isPK: pkSet.has(key),
      isFK: Boolean(fk),
      foreignTable: fk?.table,
      foreignColumn: fk?.column,
    });

    tableMap.set(row.table_name, table);
  }

  const schema: SchemaResponse = { tables: Array.from(tableMap.values()) };
  cache.set(projectId, schema);
  return schema;
}

/** Clears the in-memory schema caches for a project, forcing the next call to re-fetch. */
export function clearProjectSchemaCache(projectId: string): void {
  getSchemaCache().delete(projectId);
  getStructCache().delete(projectId);
}
