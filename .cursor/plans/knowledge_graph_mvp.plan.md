---
name: Knowledge Graph from OCR Text
overview: Build a knowledge graph feature that extracts entities (people, places, works, eras, titles, events, concepts) and their relationships from OCR'd classical Chinese text using Gemini, stores the graph as JSON, and visualizes it with an interactive force-directed graph.
todos:
  - id: types
    content: Add KnowledgeGraph types to lib/types.ts (GraphNode, GraphEdge, KnowledgeGraph)
    status: pending
  - id: extraction
    content: Create lib/knowledge-graph.ts — Gemini extraction prompt + graph JSON storage
    status: pending
  - id: api-extract
    content: Create app/api/graph/route.ts — POST to extract graph, GET to retrieve stored graph
    status: pending
  - id: install-deps
    content: Install react-force-graph-2d for interactive visualization
    status: pending
  - id: graph-page
    content: Create app/graph/page.tsx — force-directed graph visualization with node details panel
    status: pending
  - id: wire-nav
    content: Add Graph navigation link to main page header
    status: pending
  - id: test
    content: Test the full flow — extraction from OCR data, storage, visualization
    status: pending
isProject: false
---

# Knowledge Graph from OCR Text — MVP

## Approach

LLM-powered entity extraction from OCR text + lightweight client-side graph visualization.

### Why this approach

- **No NLP pipeline** — no spaCy, no custom NER training for classical Chinese
- **No graph database** — just a JSON file (`.data/graph.json`)
- **Gemini already understands classical Chinese** — it can extract entities and infer relationships
- **Gemini client already wired up** in `lib/gemini.ts`

## Pipeline

1. **Extract** — Collect all OCR text from all history entries → send to Gemini with structured prompt → get `{nodes: [...], edges: [...]}`
2. **Store** — Save to `.data/graph.json`
3. **Visualize** — `react-force-graph-2d` force-directed graph on `/graph` page

## Data Model

```typescript
interface GraphNode {
  id: string;
  label: string;
  type: "PERSON" | "PLACE" | "WORK" | "ERA" | "TITLE" | "EVENT" | "CONCEPT";
  description?: string;
  sourceEntryIds: string[];   // which history entries this was found in
}

interface GraphEdge {
  source: string;  // node id
  target: string;  // node id
  relation: string;
  description?: string;
}

interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  extractedAt: string;
  sourceEntryIds: string[];
}
```

## API

- `POST /api/graph` — triggers extraction from all (or selected) OCR history entries
- `GET /api/graph` — returns the stored graph JSON

## Visualization

- Interactive force-directed graph using `react-force-graph-2d`
- Nodes colored by entity type
- Click node to see details (description, source documents)
- Click edge to see relationship details
- Filter by entity type
- Search/highlight nodes

## Architecture

```mermaid
flowchart LR
    History[".data/history.json\n(OCR blocks)"] --> Collect["Collect all text"]
    Collect --> Gemini["Gemini 3 Flash\nextract entities"]
    Gemini --> Graph[".data/graph.json\n{nodes, edges}"]
    Graph --> Viz["Force Graph\n/graph page"]
```
