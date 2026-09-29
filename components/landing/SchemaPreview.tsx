"use client";

import { Hash, KeyRound } from "lucide-react";
import { useState } from "react";

type Badge = "pk" | "fk" | null;

/** Each relationship links a foreign key column to the primary key it points at. */
const RELATIONS = [
  { id: 0, from: "orders.customer_id", to: "customers.id" },
  { id: 1, from: "order_items.order_id", to: "orders.id" },
];

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

function relationFor(key: string) {
  return RELATIONS.find((r) => r.from === key || r.to === key)?.id ?? null;
}

export default function SchemaPreview() {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {TABLES.map((table, index) => {
          const tableLit = hover !== null && RELATIONS[hover] && [RELATIONS[hover].from, RELATIONS[hover].to].some((k) => k.startsWith(`${table.name}.`));
          return (
            <div key={table.name} className="flex flex-col items-stretch sm:flex-1 sm:flex-row">
              <div
                className={`schema-card w-full overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-300 ${
                  tableLit ? "!border-accent/60 !shadow-[0_0_28px_rgb(var(--accent-green)/0.18)]" : "border-border"
                }`}
                style={{ animationDelay: `${index * 150}ms, ${index * 2}s` }}
              >
                <div className="border-b border-border bg-surface px-4 py-2.5">
                  <span className="font-mono text-sm font-semibold text-ink">{table.name}</span>
                </div>
                <div className="divide-y divide-border/60">
                  {table.columns.map((column) => {
                    const key = `${table.name}.${column.name}`;
                    const rel = relationFor(key);
                    const lit = rel !== null && rel === hover;
                    return (
                      <div
                        key={column.name}
                        onMouseEnter={() => rel !== null && setHover(rel)}
                        onMouseLeave={() => setHover(null)}
                        className={`flex items-center justify-between gap-3 px-4 py-2 text-xs transition-colors duration-200 ${
                          rel !== null ? "cursor-pointer" : ""
                        } ${lit ? "bg-accent-muted" : ""}`}
                      >
                        <span className={`flex items-center gap-2 font-mono ${lit ? "text-accent" : "text-ink-secondary"}`}>
                          {column.badge === "pk" && <KeyRound className="h-3 w-3 text-accent" strokeWidth={2} />}
                          {column.badge === "fk" && (
                            <Hash className={`h-3 w-3 ${lit ? "text-accent" : "text-ink-dim"}`} strokeWidth={2} />
                          )}
                          {column.name}
                        </span>
                        <span className="text-ink-dim">{column.type}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {index < TABLES.length - 1 && (
                <div
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                  className={`relative h-10 w-px shrink-0 cursor-pointer self-center transition-all duration-300 sm:h-px sm:w-10 ${
                    hover === index ? "bg-accent shadow-[0_0_12px_rgb(var(--accent-green))]" : "bg-border"
                  }`}
                >
                  <span className="schema-dot-vertical block sm:hidden" style={{ animationDelay: `${index * 1.5}s` }} />
                  <span className="schema-dot hidden sm:block" style={{ animationDelay: `${index * 1.5}s` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 h-4 text-center font-mono text-[11px] text-ink-tertiary">
        {hover !== null ? (
          <span key={hover} className="rise-in inline-block">
            <span className="text-accent">{RELATIONS[hover].from}</span>
            <span className="text-ink-dim"> → </span>
            <span className="text-accent">{RELATIONS[hover].to}</span>
          </span>
        ) : (
          <span className="text-ink-dim">Hover a key to trace the relationship</span>
        )}
      </p>
    </div>
  );
}
