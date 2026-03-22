import { NextRequest, NextResponse } from "next/server";
import { getAllHistory } from "@/lib/history";
import { getGeminiClient } from "@/lib/gemini";
import { splitTextIntoParagraphs } from "@/lib/text-utils";

const MODEL_NAME = "gemini-3-flash-preview";

interface SearchResult {
  id: string;
  kind: "ocr" | "text";
  filename: string;
  score: number;
  matchedSnippet: string;
  matchedBlockIndices: number[];
  blockCount: number;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing or empty query" },
        { status: 400 }
      );
    }

    const entries = getAllHistory();
    if (entries.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const entriesWithText = entries
      .filter((e) => e.blocks.length > 0 || (e.rawText && e.rawText.trim().length > 0))
      .map((e) => {
        const hasBlocks = e.blocks.length > 0;
        const blocks = hasBlocks
          ? e.blocks.map((b, i) => ({ index: i, text: b.text }))
          : splitTextIntoParagraphs(e.rawText!).map((p, i) => ({ index: i, text: p }));
        return {
          id: e.id,
          kind: e.kind,
          filename: e.filename,
          blocks,
          blockCount: blocks.length,
          updatedAt: e.updatedAt,
        };
      });

    if (entriesWithText.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const documentsForPrompt = entriesWithText
      .map((e, docIdx) => {
        const blocksText = e.blocks
          .map((b) => `  [BLOCK_${b.index}] ${b.text}`)
          .join("\n");
        return `[DOC_${docIdx}] filename="${e.filename}" kind="${e.kind}"\n${blocksText}`;
      })
      .join("\n\n---\n\n");

    const prompt = `You are a semantic search engine for classical Chinese literature.

Given a user query and a set of documents (each split into numbered blocks), rank the documents by semantic relevance and identify the specific blocks that match. Documents may be OCR-extracted or manually entered text — treat them equally.

User query: "${query.trim()}"

Documents:
${documentsForPrompt}

Return ONLY valid JSON (no markdown fencing). For each document that has ANY relevance (score > 0), return:
- "index": the document index number (from DOC_N)
- "score": relevance score from 0.0 to 1.0 (1.0 = perfect match)
- "snippet": the most relevant short excerpt (up to ~50 characters) from that document
- "matched_blocks": array of BLOCK_N indices that are most relevant to the query

Format: {"results": [{"index": 0, "score": 0.95, "snippet": "...", "matched_blocks": [0, 2, 5]}, ...]}
Sort by score descending. Omit documents with 0 relevance.`;

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent([{ text: prompt }]);
    const text = result.response.text();

    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      results: { index: number; score: number; snippet: string; matched_blocks?: number[] }[];
    };

    const searchResults: SearchResult[] = parsed.results
      .filter((r) => r.index >= 0 && r.index < entriesWithText.length && r.score > 0)
      .map((r) => {
        const entry = entriesWithText[r.index];
        return {
          id: entry.id,
          kind: entry.kind,
          filename: entry.filename,
          score: Math.round(r.score * 100) / 100,
          matchedSnippet: r.snippet,
          matchedBlockIndices: (r.matched_blocks ?? []).filter(
            (i) => i >= 0 && i < entry.blockCount
          ),
          blockCount: entry.blockCount,
          updatedAt: entry.updatedAt,
        };
      })
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ results: searchResults });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
