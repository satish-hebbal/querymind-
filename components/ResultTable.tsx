import type { CellValue, QueryResult } from "@/types";

interface ResultTableProps {
  result: QueryResult;
}

function formatCell(value: CellValue): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value);
}

export default function ResultTable({ result }: ResultTableProps) {
  const { columns, rows } = result;

  if (rows.length === 0 || columns.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-gray-400">
        Query returned no rows.
      </div>
    );
  }

  return (
    <div className="max-h-96 w-full overflow-auto rounded-lg border border-border">
      <table className="w-full min-w-full text-left text-sm">
        <thead className="sticky top-0 bg-surface">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="whitespace-nowrap border-b border-border px-3 py-2 font-medium text-gray-300"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/60 last:border-b-0 hover:bg-white/5">
              {columns.map((column) => (
                <td key={column} className="whitespace-nowrap px-3 py-2 text-gray-200">
                  {formatCell(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
