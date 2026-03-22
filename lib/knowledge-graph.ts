import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { getGeminiClient } from "./gemini";
import { getAllHistory } from "./history";
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

function collectAllOCRText(entries: HistoryEntry[]): { text: string; entryIds: string[] } {
  const entryIds: string[] = [];
  const sections: string[] = [];

  for (const entry of entries) {
    if (entry.blocks.length === 0) continue;
    entryIds.push(entry.id);
    const docText = entry.blocks.map((b) => b.text).join("\n");
    sections.push(`【文獻: ${entry.filename}】\n${docText}`);
  }

  return { text: sections.join("\n\n---\n\n"), entryIds };
}

export async function extractKnowledgeGraph(
  entryIds?: string[]
): Promise<KnowledgeGraph> {
  const allEntries = getAllHistory();
  const entries = entryIds
    ? allEntries.filter((e) => entryIds.includes(e.id))
    : allEntries;

  if (entries.length === 0) {
    throw new Error("No OCR entries found to extract from");
  }

  const { text, entryIds: sourceIds } = collectAllOCRText(entries);

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await model.generateContent([
    { text: EXTRACTION_PROMPT + text },
  ]);

  const response = result.response;
  const raw = response
    .text()
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  const parsed = JSON.parse(raw) as { nodes: GraphNode[]; edges: GraphEdge[] };

  const nodes = parsed.nodes.map((n) => ({
    ...n,
    sourceEntryIds: sourceIds,
  }));

  const graph: KnowledgeGraph = {
    nodes,
    edges: parsed.edges,
    extractedAt: new Date().toISOString(),
    sourceEntryIds: sourceIds,
  };

  saveGraph(graph);
  return graph;
}

export function getStoredGraph(): KnowledgeGraph | null {
  if (!existsSync(GRAPH_FILE)) return null;
  const raw = readFileSync(GRAPH_FILE, "utf-8");
  return JSON.parse(raw) as KnowledgeGraph;
}

function saveGraph(graph: KnowledgeGraph) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), "utf-8");
}
