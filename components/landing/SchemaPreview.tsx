import { Hash, KeyRound } from "lucide-react";

type Badge = "pk" | "fk" | null;

const TABLES: { name: string; columns: { name: string; type: string; badge: Badge }[] }[] = [
  {
    name: "customers",
    columns: [
      { name: "id", type: "uuid", badge: "pk" },
      { name: "name", type: "text", badge: null },
      { name: "email", type: "text", badge: null },
      { name: "created_at", type: "timestamptz", badge: null },
    ],
  },
  {
    name: "orders",
    columns: [
      { name: "id", type: "uuid", badge: "pk" },
      { name: "customer_id", type: "uuid", badge: "fk" },
      { name: "amount", type: "numeric", badge: null },
      { name: "created_at", type: "timestamptz", badge: null },
    ],
  },
  {
    name: "order_items",
    columns: [
      { name: "id", type: "uuid", badge: "pk" },
      { name: "order_id", type: "uuid", badge: "fk" },
      { name: "product_id", type: "uuid", badge: "fk" },
      { name: "quantity", type: "int4", badge: null },
    ],
  },
];

export default function SchemaPreview() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch">
      {TABLES.map((table, index) => (
        <div key={table.name} className="flex flex-col items-stretch sm:flex-row sm:flex-1">
          <div
            className="schema-card w-full overflow-hidden rounded-xl border border-border bg-card"
            style={{ animationDelay: `${index * 150}ms, ${index * 2}s` }}
          >
            <div className="border-b border-border bg-surface px-4 py-2.5">
              <span className="font-mono text-sm font-semibold text-ink">{table.name}</span>
            </div>
            <div className="divide-y divide-border/60">
              {table.columns.map((column) => (
                <div key={column.name} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                  <span className="flex items-center gap-2 font-mono text-ink-secondary">
                    {column.badge === "pk" && <KeyRound className="h-3 w-3 text-accent" strokeWidth={2} />}
                    {column.badge === "fk" && <Hash className="h-3 w-3 text-ink-dim" strokeWidth={2} />}
                    {column.name}
                  </span>
                  <span className="text-ink-dim">{column.type}</span>
                </div>
              ))}
            </div>
          </div>

          {index < TABLES.length - 1 && (
            <div className="relative h-10 w-px shrink-0 self-center bg-border sm:h-px sm:w-10">
              <span className="schema-dot-vertical block sm:hidden" style={{ animationDelay: `${index * 1.5}s` }} />
              <span className="schema-dot hidden sm:block" style={{ animationDelay: `${index * 1.5}s` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
