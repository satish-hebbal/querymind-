"use client";

import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Key, Link2, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ResultTable from "@/components/ResultTable";
import type { SchemaResponse, SchemaTable, TableInfo } from "@/types";

const NODE_WIDTH = 260;
const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 28;

interface TableNodeData extends Record<string, unknown> {
  table: SchemaTable;
}

type TableNodeType = Node<TableNodeData, "table">;

function TableNode({ data, selected }: NodeProps<TableNodeType>) {
  const { table } = data;

  return (
    <div
      className={`w-[260px] cursor-pointer overflow-hidden rounded-lg border bg-card text-xs transition-all duration-150 ${
        selected ? "border-border-bright shadow-glow-md" : "border-border hover:border-border-bright"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-none !bg-border-bright" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-none !bg-border-bright" />

      <div className="truncate border-b border-border bg-elevated px-3 py-2 font-semibold text-ink">
        {table.name}
      </div>

      <div>
        {table.columns.map((column) => (
          <div
            key={column.name}
            className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-1.5 text-ink-secondary">
              {column.isPK && <Key size={12} strokeWidth={1.5} className="shrink-0 text-ink" />}
              {column.isFK && <Link2 size={12} strokeWidth={1.5} className="shrink-0 text-ink-dim" />}
              <span className="truncate">{column.name}</span>
            </div>
            <span className="shrink-0 rounded bg-elevated px-1.5 py-0.5 text-[10px] text-ink-secondary">{column.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes = { table: TableNode };

function buildGraph(schema: SchemaResponse, isLight: boolean): { nodes: TableNodeType[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 140 });

  const heights = new Map<string, number>();

  for (const table of schema.tables) {
    const height = HEADER_HEIGHT + Math.max(table.columns.length, 1) * ROW_HEIGHT;
    heights.set(table.name, height);
    graph.setNode(table.name, { width: NODE_WIDTH, height });
  }

  const edges: Edge[] = [];

  for (const table of schema.tables) {
    for (const column of table.columns) {
      if (column.isFK && column.foreignTable && heights.has(column.foreignTable)) {
        const id = `${table.name}.${column.name}->${column.foreignTable}.${column.foreignColumn}`;
        edges.push({
          id,
          source: table.name,
          target: column.foreignTable,
          label: `${table.name}.${column.name} → ${column.foreignTable}.${column.foreignColumn}`,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
          style: { stroke: "#6366f1" },
          labelStyle: { fill: isLight ? "#78716c" : "#9ca3af", fontSize: 10 },
          labelBgStyle: { fill: isLight ? "#f5f5f4" : "#1a1a1a" },
        });
        graph.setEdge(table.name, column.foreignTable);
      }
    }
  }

  dagre.layout(graph);

  const nodes: TableNodeType[] = schema.tables.map((table) => {
    const position = graph.node(table.name);
    const height = heights.get(table.name) ?? HEADER_HEIGHT;

    return {
      id: table.name,
      type: "table",
      position: { x: position.x - NODE_WIDTH / 2, y: position.y - height / 2 },
      data: { table },
    };
  });

  return { nodes, edges };
}

interface VisualizerClientProps {
  projectId: string;
}

export default function VisualizerClient({ projectId }: VisualizerClientProps) {
  const router = useRouter();
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<SchemaTable | null>(null);
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [tableInfoLoading, setTableInfoLoading] = useState(false);
  const [tableInfoError, setTableInfoError] = useState<string | null>(null);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsLight(root.classList.contains("light"));
    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/schema/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error as string);
        else setSchema(data as SchemaResponse);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load schema.");
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const { nodes, edges } = useMemo(
    () => (schema ? buildGraph(schema, isLight) : { nodes: [], edges: [] }),
    [schema, isLight]
  );

  useEffect(() => {
    if (!selectedTable) {
      setTableInfo(null);
      return;
    }

    let cancelled = false;
    setTableInfoLoading(true);
    setTableInfoError(null);

    fetch(`/api/projects/${projectId}/table-info?table=${encodeURIComponent(selectedTable.name)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setTableInfoError(data.error as string);
        else setTableInfo(data as TableInfo);
      })
      .catch((err) => {
        if (!cancelled) setTableInfoError(err instanceof Error ? err.message : "Failed to load table info.");
      })
      .finally(() => {
        if (!cancelled) setTableInfoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTable, projectId]);

  function handleAskAboutTable(table: SchemaTable) {
    window.sessionStorage.setItem("datagini:pending-question", `Show me the columns and sample data from the ${table.name} table`);
    router.push(`/project/${projectId}/chat`);
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-error">{error}</div>
    );
  }

  if (!schema) {
    return (
      <div className="flex h-full items-center justify-center text-ink-dim">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (schema.tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-ink-dim">
        No tables found in the public schema.
      </div>
    );
  }

  return (
    <div className="relative flex h-full">
      <div className="h-full flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_event, node) => setSelectedTable((node as TableNodeType).data.table)}
          onPaneClick={() => setSelectedTable(null)}
          colorMode={isLight ? "light" : "dark"}
          fitView
        >
          <Background color={isLight ? "#d6d3d1" : "#2a2a2a"} />
          <Controls />
          <MiniMap
            pannable
            zoomable
            bgColor={isLight ? "#f5f5f4" : "#111111"}
            maskColor={isLight ? "rgba(245,245,244,0.6)" : "rgba(10,10,10,0.6)"}
            nodeColor="#6366f1"
          />
        </ReactFlow>
      </div>

      {selectedTable && (
        <DetailPanel
          table={selectedTable}
          info={tableInfo}
          loading={tableInfoLoading}
          error={tableInfoError}
          onClose={() => setSelectedTable(null)}
          onAsk={() => handleAskAboutTable(selectedTable)}
        />
      )}
    </div>
  );
}

interface DetailPanelProps {
  table: SchemaTable;
  info: TableInfo | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onAsk: () => void;
}

function DetailPanel({ table, info, loading, error, onClose, onAsk }: DetailPanelProps) {
  return (
    <aside className="absolute inset-y-0 right-0 z-10 flex w-full max-w-sm flex-col border-l border-border bg-surface shadow-2xl sm:w-80">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="truncate text-sm font-semibold text-ink">{table.name}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-dim hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-ink-dim" />
          </div>
        )}

        {error && <p className="text-sm text-error">{error}</p>}

        {info && (
          <>
            <div>
              <p className="text-xs text-ink-dim">Row count</p>
              <p className="text-lg font-semibold text-ink">{info.rowCount.toLocaleString("en-IN")}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-dim">Columns</p>
              <ul className="space-y-1">
                {table.columns.map((column) => (
                  <li key={column.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-ink-secondary">
                      {column.isPK && <Key className="h-3 w-3 shrink-0 text-ink" />}
                      {column.isFK && <Link2 className="h-3 w-3 shrink-0 text-ink-dim" />}
                      {column.name}
                    </span>
                    <span className="shrink-0 text-ink-dim">{column.type}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-dim">Sample data</p>
              <ResultTable result={{ sql: "", columns: info.columns, rows: info.sample, rowCount: info.sample.length }} />
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={onAsk}
          className="w-full rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg transition hover:opacity-90"
        >
          Ask about this table
        </button>
      </div>
    </aside>
  );
}
