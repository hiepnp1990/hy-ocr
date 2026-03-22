import { extractKnowledgeGraph, getStoredGraph } from "@/lib/knowledge-graph";

export async function GET() {
  const graph = getStoredGraph();
  if (!graph) {
    return Response.json({ success: true, graph: null });
  }
  return Response.json({ success: true, graph });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const entryIds: string[] | undefined = body.entryIds;

    const graph = await extractKnowledgeGraph(entryIds);
    return Response.json({ success: true, graph });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
