"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeGraph, GraphNode, GraphEdge, EntityType } from "@/lib/types";
import type { ForceGraphMethods } from "react-force-graph-2d";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as any;

const ENTITY_COLORS: Record<EntityType, string> = {
  PERSON: "#e74c3c",
  PLACE: "#2ecc71",
  WORK: "#3498db",
  ERA: "#f39c12",
  TITLE: "#9b59b6",
  EVENT: "#e67e22",
  CONCEPT: "#1abc9c",
};

const ENTITY_LABELS: Record<EntityType, string> = {
  PERSON: "人物",
  PLACE: "地點",
  WORK: "著作",
  ERA: "年代",
  TITLE: "官職",
  EVENT: "事件",
  CONCEPT: "概念",
};

interface FGNode {
  id?: string | number;
  x?: number;
  y?: number;
  label?: string;
  type?: EntityType;
  description?: string;
  sourceEntryIds?: string[];
  [key: string]: unknown;
}

export default function GraphPage() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<EntityType>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const fgRef = useRef<ForceGraphMethods>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    fetchGraph();
  }, []);

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  async function fetchGraph() {
    try {
      const res = await fetch("/api/graph");
      const data = await res.json();
      if (data.graph) setGraph(data.graph);
    } catch {
      setError("Failed to load graph");
    } finally {
      setLoading(false);
    }
  }

  async function handleExtract() {
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/graph", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Extraction failed");
      setGraph(data.graph);
      setSelectedNode(null);
      setSelectedEdge(null);
      setTimeout(() => fgRef.current?.zoomToFit(400, 50), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  const toggleFilter = useCallback((type: EntityType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const graphData = (() => {
    if (!graph) return { nodes: [], links: [] };

    let nodes = graph.nodes;
    if (activeFilters.size > 0) {
      nodes = nodes.filter((n) => activeFilters.has(n.type));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      nodes = nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          (n.description ?? "").toLowerCase().includes(q)
      );
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = graph.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    return {
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((e) => ({ ...e })),
    };
  })();

  const handleNodeClick = useCallback(
    (node: FGNode) => {
      if (!graph) return;
      const found = graph.nodes.find((n) => n.id === node.id);
      setSelectedNode(found ?? null);
      setSelectedEdge(null);
    },
    [graph]
  );

  const handleLinkClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any) => {
      if (!graph) return;
      const srcId = typeof link.source === "object" ? link.source.id : link.source;
      const tgtId = typeof link.target === "object" ? link.target.id : link.target;
      const found = graph.edges.find(
        (e: GraphEdge) => e.source === srcId && e.target === tgtId && e.relation === link.relation
      );
      setSelectedEdge(found ?? null);
      setSelectedNode(null);
    },
    [graph]
  );

  const nodeCanvasObject = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.label || "";
      const type = (node.type || "CONCEPT") as EntityType;
      const fontSize = Math.max(12 / globalScale, 3);
      const nodeR = Math.max(6, 4 + label.length * 0.8);

      ctx.beginPath();
      ctx.arc(node.x!, node.y!, nodeR, 0, 2 * Math.PI);
      ctx.fillStyle = ENTITY_COLORS[type] || "#999";
      ctx.fill();

      if (selectedNode?.id === node.id) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      ctx.font = `${fontSize}px "Geist", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#e0e0e0";
      ctx.fillText(label, node.x!, node.y! + nodeR + 2);
    },
    [selectedNode]
  );

  const nodePointerAreaPaint = useCallback(
    (node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
      const label = node.label || "";
      const nodeR = Math.max(6, 4 + label.length * 0.8);
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, nodeR + 2, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    []
  );

  const connectedEdges = selectedNode
    ? graph?.edges.filter(
        (e) => e.source === selectedNode.id || e.target === selectedNode.id
      ) ?? []
    : [];

  return (
    <main className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-[#111] shrink-0">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" /><path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" /><path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" />
              </svg>
              <h1 className="text-base font-bold tracking-tight text-neutral-100">
                Knowledge Graph
              </h1>
            </Link>
            {graph && (
              <span className="text-xs text-neutral-500">
                {graph.nodes.length} nodes &middot; {graph.edges.length} edges
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                Back to OCR
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={handleExtract}
              disabled={extracting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {extracting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Extracting...
                </>
              ) : graph ? (
                "Re-extract"
              ) : (
                "Extract Knowledge Graph"
              )}
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="px-4 py-2 bg-red-950/50 border-b border-red-900/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Filter bar */}
      {graph && (
        <div className="border-b border-neutral-800 bg-[#111] px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-xs text-neutral-500 mr-1">Filter:</span>
          {(Object.keys(ENTITY_COLORS) as EntityType[]).map((type) => {
            const count = graph.nodes.filter((n) => n.type === type).length;
            if (count === 0) return null;
            const active = activeFilters.size === 0 || activeFilters.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  active
                    ? "opacity-100"
                    : "opacity-30 hover:opacity-60"
                }`}
                style={{
                  backgroundColor: ENTITY_COLORS[type] + "22",
                  color: ENTITY_COLORS[type],
                  border: `1px solid ${ENTITY_COLORS[type]}44`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ENTITY_COLORS[type] }}
                />
                {ENTITY_LABELS[type]} ({count})
              </button>
            );
          })}
          <div className="ml-auto">
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-md px-3 py-1 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 w-48"
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph canvas */}
        <div ref={containerRef} className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm">
              Loading...
            </div>
          )}

          {!loading && !graph && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-700">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" /><path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" /><path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" />
              </svg>
              <p className="text-sm">No knowledge graph yet.</p>
              <p className="text-xs text-neutral-600">
                Click &ldquo;Extract Knowledge Graph&rdquo; to analyze your OCR documents.
              </p>
            </div>
          )}

          {!loading && graph && graphData.nodes.length > 0 && (
            <ForceGraph2D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              backgroundColor="#0a0a0a"
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={nodePointerAreaPaint}
              linkColor={() => "#333"}
              linkWidth={1.5}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={0.85}
              linkDirectionalArrowColor={() => "#555"}
              linkLabel={(link: { relation?: string }) => link.relation || ""}
              onNodeClick={handleNodeClick}
              onLinkClick={handleLinkClick}
              onBackgroundClick={() => {
                setSelectedNode(null);
                setSelectedEdge(null);
              }}
              cooldownTicks={100}
              enableNodeDrag={true}
            />
          )}

          {!loading && graph && graphData.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm">
              No nodes match your filter/search.
            </div>
          )}
        </div>

        {/* Detail panel */}
        {(selectedNode || selectedEdge) && (
          <div className="w-80 border-l border-neutral-800 bg-[#111] overflow-y-auto shrink-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-neutral-200">Details</h3>
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    setSelectedEdge(null);
                  }}
                  className="text-neutral-500 hover:text-neutral-300 text-xs"
                >
                  Close
                </button>
              </div>

              {selectedNode && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-lg font-bold text-neutral-100">
                      {selectedNode.label}
                    </h4>
                    <Badge
                      className="mt-1 text-[10px]"
                      style={{
                        backgroundColor: ENTITY_COLORS[selectedNode.type] + "22",
                        color: ENTITY_COLORS[selectedNode.type],
                        borderColor: ENTITY_COLORS[selectedNode.type] + "44",
                      }}
                    >
                      {ENTITY_LABELS[selectedNode.type]}
                    </Badge>
                  </div>
                  {selectedNode.description && (
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      {selectedNode.description}
                    </p>
                  )}
                  {connectedEdges.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                        Relationships ({connectedEdges.length})
                      </h5>
                      <div className="space-y-1.5">
                        {connectedEdges.map((edge, i) => {
                          const isSource = edge.source === selectedNode.id;
                          const otherLabel =
                            graph?.nodes.find(
                              (n) => n.id === (isSource ? edge.target : edge.source)
                            )?.label ?? "?";
                          return (
                            <div
                              key={i}
                              className="text-xs text-neutral-400 bg-neutral-900/50 rounded px-2.5 py-1.5"
                            >
                              {isSource ? (
                                <>
                                  <span className="text-neutral-300">
                                    {edge.relation}
                                  </span>{" "}
                                  &rarr; {otherLabel}
                                </>
                              ) : (
                                <>
                                  {otherLabel}{" "}
                                  <span className="text-neutral-300">
                                    {edge.relation}
                                  </span>{" "}
                                  &rarr; this
                                </>
                              )}
                              {edge.description && (
                                <div className="text-neutral-600 mt-0.5">
                                  {edge.description}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedEdge && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-base font-bold text-neutral-100">
                      {selectedEdge.relation}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <span className="text-neutral-200">
                      {graph?.nodes.find((n) => n.id === selectedEdge.source)?.label}
                    </span>
                    <span>&rarr;</span>
                    <span className="text-neutral-200">
                      {graph?.nodes.find((n) => n.id === selectedEdge.target)?.label}
                    </span>
                  </div>
                  {selectedEdge.description && (
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      {selectedEdge.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
