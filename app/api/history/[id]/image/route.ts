import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { getHistoryEntry, getImageAbsolutePath } from "@/lib/history";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = getHistoryEntry(id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const imagePath = getImageAbsolutePath(entry);
  const imageBuffer = readFileSync(imagePath);

  return new NextResponse(imageBuffer, {
    headers: {
      "Content-Type": entry.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
