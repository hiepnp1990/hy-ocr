"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeGraph, GraphNode, GraphEdge, EntityType, HistoryEntry } from "@/lib/types";
import type { ForceGraphMethods } from "react-force-graph-2d";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as any;

const ENTITY_COLORS: Record<EntityType, string> = {
  PERSON: "#c23b22",
  PLACE: "#5b8c5a",
  WORK: "#4a6fa5",
  ERA: "#c9a84c",
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
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [entryDropdownOpen, setEntryDropdownOpen] = useState(false);
  const entryDropdownRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    fetchGraph();
    fetchHistoryEntries();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (entryDropdownRef.current && !entryDropdownRef.current.contains(e.target as Node)) {
        setEntryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  async function fetchHistoryEntries() {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.entries) setHistoryEntries(data.entries);
    } catch {
      /* ignore */
    }
  }

  const toggleEntryId = useCallback((entryId: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }, []);

  const clearEntryFilter = useCallback(() => {
    setSelectedEntryIds(new Set());
  }, []);

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

    if (selectedEntryIds.size > 0) {
      nodes = nodes.filter((n) =>
        n.sourceEntryIds.some((id) => selectedEntryIds.has(id))
      );
    }
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
      const fontSize = Math.max(14 / globalScale, 4);
      const nodeR = Math.max(8, 5 + label.length * 0.9);

      ctx.beginPath();
      ctx.arc(node.x!, node.y!, nodeR, 0, 2 * Math.PI);
      ctx.fillStyle = ENTITY_COLORS[type] || "#999";
      ctx.fill();

      if (selectedNode?.id === node.id) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2.5 / globalScale;
        ctx.stroke();
      }

      ctx.font = `${fontSize}px "Noto Serif SC", serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#e8dcc8";
      ctx.fillText(label, node.x!, node.y! + nodeR + 3);
    },
    [selectedNode]
  );

  const nodePointerAreaPaint = useCallback(
    (node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
      const label = node.label || "";
      const nodeR = Math.max(8, 5 + label.length * 0.9);
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, nodeR + 3, 0, 2 * Math.PI);
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
    <main className="flex flex-col h-screen bg-[#1a1208]">
      <header className="border-b-2 border-[#3d2e1e] bg-[#261c10] shrink-0">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-jade">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" /><path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" /><path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" />
              </svg>
              <h1 className="text-xl font-bold tracking-wide text-[#e8dcc8]" style={{ fontFamily: "var(--font-heading)" }}>
                Knowledge Graph
              </h1>
            </Link>
            {graph && (
              <span className="text-sm text-[#8b7355]">
                {graphData.nodes.length}/{graph.nodes.length} nodes &middot; {graphData.links.length}/{graph.edges.length} edges
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="default" className="border-[#3d2e1e] text-[#e8dcc8] hover:bg-[#3d2e1e]">
                Back to OCR
              </Button>
            </Link>
            <Button
              size="default"
              onClick={handleExtract}
              disabled={extracting}
              className="bg-jade hover:bg-jade/90 text-white"
            >
              {extracting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        <div className="px-6 py-3 bg-[#3a1515] border-b-2 border-[#5a2020] text-[#e8a0a0] text-base">
          {error}
        </div>
      )}

      {graph && (
        <div className="border-b-2 border-[#3d2e1e] bg-[#261c10] px-6 py-3 flex items-center gap-3 shrink-0 flex-wrap">
          <span className="text-sm text-[#8b7355] mr-1">Filter:</span>
          {(Object.keys(ENTITY_COLORS) as EntityType[]).map((type) => {
            const count = graph.nodes.filter((n) => n.type === type).length;
            if (count === 0) return null;
            const active = activeFilters.size === 0 || activeFilters.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: ENTITY_COLORS[type] }}
                />
                {ENTITY_LABELS[type]} ({count})
              </button>
            );
          })}
          {graph && graph.sourceEntryIds.length > 0 && (
            <div className="relative ml-3" ref={entryDropdownRef}>
              <button
                onClick={() => setEntryDropdownOpen((o) => !o)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                  selectedEntryIds.size > 0
                    ? "bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/40"
                    : "bg-[#261c10] text-[#a89070] border-[#3d2e1e] hover:border-[#8b7355]"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                </svg>
                {selectedEntryIds.size > 0
                  ? `${selectedEntryIds.size} doc${selectedEntryIds.size > 1 ? "s" : ""}`
                  : "All docs"}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {entryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-[#261c10] border-2 border-[#3d2e1e] rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b-2 border-[#3d2e1e] flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#8b7355]">
                      Filter by document
                    </span>
                    {selectedEntryIds.size > 0 && (
                      <button
                        onClick={clearEntryFilter}
                        className="text-xs text-[#c9a84c] hover:text-[#d4b45c]"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {graph.sourceEntryIds.map((entryId) => {
                      const entry = historyEntries.find((e) => e.id === entryId);
                      const label = entry?.filename ?? entryId;
                      const checked = selectedEntryIds.has(entryId);
                      const nodeCount = graph.nodes.filter((n) =>
                        n.sourceEntryIds.includes(entryId)
                      ).length;
                      return (
                        <label
                          key={entryId}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#3d2e1e]/60 transition-colors ${
                            checked ? "bg-[#3d2e1e]/40" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEntryId(entryId)}
                            className="accent-[#c9a84c] w-4 h-4 shrink-0"
                          />
                          <span className="text-sm text-[#e8dcc8] truncate flex-1">
                            {label}
                          </span>
                          <span className="text-xs text-[#8b7355] shrink-0">
                            {nodeCount} nodes
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="ml-auto">
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1a1208] border-2 border-[#3d2e1e] rounded-md px-4 py-1.5 text-sm text-[#e8dcc8] placeholder:text-[#8b7355] focus:outline-none focus:border-[#8b7355] w-56"
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div ref={containerRef} className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-[#8b7355] text-base">
              Loading...
            </div>
          )}

          {!loading && !graph && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[#8b7355] gap-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[#3d2e1e]">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" /><path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" /><path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" />
              </svg>
              <p className="text-base">No knowledge graph yet.</p>
              <p className="text-sm text-[#6b5540]">
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
              backgroundColor="#1a1208"
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={nodePointerAreaPaint}
              linkColor={() => "#3d2e1e"}
              linkWidth={1.5}
              linkDirectionalArrowLength={5}
              linkDirectionalArrowRelPos={0.85}
              linkDirectionalArrowColor={() => "#5a4530"}
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
            <div className="absolute inset-0 flex items-center justify-center text-[#8b7355] text-base">
              No nodes match your filter/search.
            </div>
          )}
        </div>

        {(selectedNode || selectedEdge) && (
          <div className="w-96 border-l-2 border-[#3d2e1e] bg-[#261c10] overflow-y-auto shrink-0">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-[#e8dcc8]">Details</h3>
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    setSelectedEdge(null);
                  }}
                  className="text-[#8b7355] hover:text-[#e8dcc8] text-sm"
                >
                  Close
                </button>
              </div>

              {selectedNode && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-[#e8dcc8]" style={{ fontFamily: "var(--font-heading)" }}>
                      {selectedNode.label}
                    </h4>
                    <Badge
                      className="mt-2 text-sm"
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
                    <p className="text-base text-[#a89070] leading-relaxed">
                      {selectedNode.description}
                    </p>
                  )}
                  {connectedEdges.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-[#8b7355] uppercase tracking-wider mb-3">
                        Relationships ({connectedEdges.length})
                      </h5>
                      <div className="space-y-2">
                        {connectedEdges.map((edge, i) => {
                          const isSource = edge.source === selectedNode.id;
                          const otherLabel =
                            graph?.nodes.find(
                              (n) => n.id === (isSource ? edge.target : edge.source)
                            )?.label ?? "?";
                          return (
                            <div
                              key={i}
                              className="text-sm text-[#a89070] bg-[#1a1208]/50 rounded-lg px-3 py-2"
                            >
                              {isSource ? (
                                <>
                                  <span className="text-[#e8dcc8]">
                                    {edge.relation}
                                  </span>{" "}
                                  &rarr; {otherLabel}
                                </>
                              ) : (
                                <>
                                  {otherLabel}{" "}
                                  <span className="text-[#e8dcc8]">
                                    {edge.relation}
                                  </span>{" "}
                                  &rarr; this
                                </>
                              )}
                              {edge.description && (
                                <div className="text-[#6b5540] mt-1">
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
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-[#e8dcc8]" style={{ fontFamily: "var(--font-heading)" }}>
                      {selectedEdge.relation}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-base text-[#a89070]">
                    <span className="text-[#e8dcc8]">
                      {graph?.nodes.find((n) => n.id === selectedEdge.source)?.label}
                    </span>
                    <span>&rarr;</span>
                    <span className="text-[#e8dcc8]">
                      {graph?.nodes.find((n) => n.id === selectedEdge.target)?.label}
                    </span>
                  </div>
                  {selectedEdge.description && (
                    <p className="text-base text-[#a89070] leading-relaxed">
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
