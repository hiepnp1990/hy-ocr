import { NextRequest, NextResponse } from "next/server";
import { getHistoryEntry, deleteHistoryEntry, updateHistoryBlocks, updateHistoryText } from "@/lib/history";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = getHistoryEntry(id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (typeof body.rawText === "string") {
    const entry = updateHistoryText(id, body.rawText);
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ entry });
  }

  const entry = updateHistoryBlocks(id, body.blocks);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteHistoryEntry(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
