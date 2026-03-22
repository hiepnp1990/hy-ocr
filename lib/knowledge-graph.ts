import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { getGeminiClient } from "./gemini";
import { getAllHistory, getHistoryEntry } from "./history";
import type { KnowledgeGraph, GraphNode, GraphEdge, HistoryEntry } from "./types";

const DATA_DIR = join(process.cwd(), ".data");
const GRAPH_FILE = join(DATA_DIR, "graph.json");
const MODEL_NAME = "gemini-3-flash-preview";

const EXTRACTION_PROMPT = `You are an expert in classical Chinese literature, history, and knowledge extraction.

Given the following classical Chinese texts (from OCR'd historical documents), extract ALL meaningful entities and relationships to build a knowledge graph.

## Entity types

- PERSON: Named individuals, historical figures, authors, officials
- PLACE: Geographic locations, provinces, mountains, rivers, cities
- WORK: Book titles, poem collections, literary works
- ERA: Dynasties, reign periods, specific years
- TITLE: Official ranks, noble titles, government positions
- EVENT: Historical events, battles, political incidents
- CONCEPT: Abstract ideas, philosophical concepts, cultural practices

## Rules

1. Extract EVERY named entity, even minor ones
2. Use the ORIGINAL Chinese text for labels (traditional characters)
3. Create an edge for every relationship you can infer between entities
4. Each node must have a unique, stable id (use the label in pinyin or a short slug)
5. Provide a brief description for each entity and relationship in Chinese
6. If a person has an alias/pen name (號/字), create a single node with the primary name and mention aliases in the description
7. Relationship types should be concise: 號 (alias), 籍貫 (native place), 官職 (held office), 著作 (authored), 朝代 (dynasty), 相關事件 (involved in), 地點 (location), etc.

## Output format

Return ONLY valid JSON (no markdown fencing, no extra text):

{
  "nodes": [
    {"id": "chen_an", "label": "陳案", "type": "PERSON", "description": "號了庵，江北順安府嘉平縣人，黎末進士"}
  ],
  "edges": [
    {"source": "chen_an", "target": "lieu_am", "relation": "號", "description": "陳案號了庵"}
  ]
}

## Text to analyze

`;

/* ── Storage ── */

export function getStoredGraph(): KnowledgeGraph | null {
  if (!existsSync(GRAPH_FILE)) return null;
  const raw = readFileSync(GRAPH_FILE, "utf-8");
  return JSON.parse(raw) as KnowledgeGraph;
}

function saveGraph(graph: KnowledgeGraph) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), "utf-8");
}

function emptyGraph(): KnowledgeGraph {
  return { nodes: [], edges: [], extractedAt: new Date().toISOString(), sourceEntryIds: [] };
}

/* ── LLM extraction (single entry) ── */

function entryToText(entry: HistoryEntry): string {
  if (entry.rawText) return entry.rawText;
  return entry.blocks.map((b) => b.text).join("\n");
}

/**
 * Call Gemini to extract entities and relationships from a single entry's text.
 * Pure LLM call — no storage side effects.
 */
export async function extractForEntry(
  entry: HistoryEntry
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const content = entryToText(entry);
  if (!content.trim()) {
    return { nodes: [], edges: [] };
  }

  const text = `【文獻: ${entry.filename}】\n${content}`;

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await model.generateContent([
    { text: EXTRACTION_PROMPT + text },
  ]);

  const raw = result.response
    .text()
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  const parsed = JSON.parse(raw) as { nodes: GraphNode[]; edges: GraphEdge[] };

  const nodes = parsed.nodes.map((n) => ({
    ...n,
    sourceEntryIds: [entry.id],
  }));

  return { nodes, edges: parsed.edges };
}

/* ── Merge logic (pure, no LLM) ── */

/**
 * Merge new nodes and edges into an existing graph.
 * - Nodes are deduped by id; if a node already exists, its sourceEntryIds are unioned.
 * - Edges are deduped by (source, target, relation).
 * Saves the result and returns the updated graph.
 */
export function mergeIntoGraph(
  incoming: { nodes: GraphNode[]; edges: GraphEdge[] },
  entryId: string,
  existing?: KnowledgeGraph | null
): KnowledgeGraph {
  const graph = existing ?? getStoredGraph() ?? emptyGraph();

  const nodeMap = new Map<string, GraphNode>();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, { ...node });
  }
  for (const node of incoming.nodes) {
    const prev = nodeMap.get(node.id);
    if (prev) {
      const ids = new Set([...prev.sourceEntryIds, ...node.sourceEntryIds]);
      nodeMap.set(node.id, {
        ...prev,
        description: node.description || prev.description,
        sourceEntryIds: [...ids],
      });
    } else {
      nodeMap.set(node.id, { ...node });
    }
  }

  const edgeKey = (e: GraphEdge) => `${e.source}::${e.target}::${e.relation}`;
  const edgeMap = new Map<string, GraphEdge>();
  for (const edge of graph.edges) {
    edgeMap.set(edgeKey(edge), edge);
  }
  for (const edge of incoming.edges) {
    const key = edgeKey(edge);
    if (!edgeMap.has(key)) {
      edgeMap.set(key, edge);
    }
  }

  const sourceIds = new Set([...graph.sourceEntryIds, entryId]);

  const updated: KnowledgeGraph = {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()],
    extractedAt: new Date().toISOString(),
    sourceEntryIds: [...sourceIds],
  };

  saveGraph(updated);
  return updated;
}

/* ── Cleanup ── */

/**
 * Remove all graph data associated with a deleted history entry.
 * - Nodes sourced only by this entry are removed entirely.
 * - Nodes shared with other entries just have the entryId stripped from sourceEntryIds.
 * - Edges referencing removed nodes are pruned.
 * - The entryId is removed from the top-level sourceEntryIds.
 */
export function removeEntryFromGraph(entryId: string): void {
  const graph = getStoredGraph();
  if (!graph) return;

  if (!graph.sourceEntryIds.includes(entryId)) return;

  const updatedNodes: GraphNode[] = [];
  for (const node of graph.nodes) {
    const remaining = node.sourceEntryIds.filter((id) => id !== entryId);
    if (remaining.length > 0) {
      updatedNodes.push({ ...node, sourceEntryIds: remaining });
    }
  }

  const survivingNodeIds = new Set(updatedNodes.map((n) => n.id));
  const updatedEdges = graph.edges.filter(
    (e) => survivingNodeIds.has(e.source) && survivingNodeIds.has(e.target)
  );

  const updatedSourceIds = graph.sourceEntryIds.filter((id) => id !== entryId);

  if (updatedNodes.length === 0) {
    saveGraph(emptyGraph());
    return;
  }

  saveGraph({
    nodes: updatedNodes,
    edges: updatedEdges,
    extractedAt: new Date().toISOString(),
    sourceEntryIds: updatedSourceIds,
  });
}

/* ── High-level operations ── */

/**
 * Ingest a single entry: extract its entities via Gemini, then merge into the stored graph.
 */
export async function ingestEntry(entryId: string): Promise<KnowledgeGraph> {
  const entry = getHistoryEntry(entryId);
  if (!entry) throw new Error(`Entry not found: ${entryId}`);

  const stored = getStoredGraph();
  if (stored?.sourceEntryIds.includes(entryId)) {
    return stored;
  }

  const extracted = await extractForEntry(entry);
  return mergeIntoGraph(extracted, entryId);
}

/**
 * Full rebuild: extract from all history entries in one Gemini call and replace the graph.
 */
export async function rebuildGraph(entryIds?: string[]): Promise<KnowledgeGraph> {
  const allEntries = getAllHistory();
  const entries = entryIds
    ? allEntries.filter((e) => entryIds.includes(e.id))
    : allEntries;

  if (entries.length === 0) {
    throw new Error("No OCR entries found to extract from");
  }

  const hasContent = (e: HistoryEntry) => e.blocks.length > 0 || !!e.rawText?.trim();
  const sections = entries
    .filter(hasContent)
    .map((e) => `【文獻: ${e.filename}】\n${entryToText(e)}`);
  const sourceIds = entries.filter(hasContent).map((e) => e.id);

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await model.generateContent([
    { text: EXTRACTION_PROMPT + sections.join("\n\n---\n\n") },
  ]);

  const raw = result.response
    .text()
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  const parsed = JSON.parse(raw) as { nodes: GraphNode[]; edges: GraphEdge[] };

  const graph: KnowledgeGraph = {
    nodes: parsed.nodes.map((n) => ({ ...n, sourceEntryIds: sourceIds })),
    edges: parsed.edges,
    extractedAt: new Date().toISOString(),
    sourceEntryIds: sourceIds,
  };

  saveGraph(graph);
  return graph;
}
