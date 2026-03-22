import { NextRequest, NextResponse } from "next/server";
import { getAllHistory, saveHistoryEntry } from "@/lib/history";

export async function GET() {
  const entries = getAllHistory();
  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, mimeType, image, blocks } = body;

    if (!filename || !mimeType || !image || !blocks) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const entry = saveHistoryEntry(filename, mimeType, image, blocks);
    return NextResponse.json({ entry });
  } catch (error) {
    console.error("History save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save" },
      { status: 500 }
    );
  }
}
