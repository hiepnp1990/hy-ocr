import { rebuildGraph, getStoredGraph } from "@/lib/knowledge-graph";

/**
 * GET /api/graph
 * Return the stored knowledge graph.
 */
export async function GET() {
  const graph = getStoredGraph();
  if (!graph) {
    return Response.json({ success: true, graph: null });
  }
  return Response.json({ success: true, graph });
}

/**
 * POST /api/graph
 * Full rebuild: extract from all (or selected) history entries and replace the graph.
 * Body: { entryIds?: string[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const entryIds: string[] | undefined = body.entryIds;

    const graph = await rebuildGraph(entryIds);
    return Response.json({ success: true, graph });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
