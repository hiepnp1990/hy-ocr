import { ingestEntry } from "@/lib/knowledge-graph";

/**
 * POST /api/graph/ingest
 * Extract entities from a single history entry and merge into the knowledge graph.
 * Body: { entryId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entryId } = body;

    if (!entryId || typeof entryId !== "string") {
      return Response.json(
        { success: false, error: "Missing or invalid entryId" },
        { status: 400 }
      );
    }

    const graph = await ingestEntry(entryId);
    return Response.json({ success: true, graph });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
