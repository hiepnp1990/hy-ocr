"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OCRWorkspace } from "@/components/ocr-workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OCRBlock, HistoryEntry } from "@/lib/types";

export default function SearchDetailPage() {
  return (
    <Suspense>
      <SearchDetailInner />
    </Suspense>
  );
}

function SearchDetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const query = searchParams.get("q") ?? "";
  const blocksParam = searchParams.get("blocks") ?? "";

  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [blocks, setBlocks] = useState<OCRBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const highlightedBlockIds = useMemo(() => {
    if (!blocksParam) return new Set<string>();
    const indices = blocksParam.split(",").map(Number).filter((n) => !isNaN(n));
    return new Set(indices.map((i) => `block-${i}`));
  }, [blocksParam]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/history/${id}`);
        if (!res.ok) {
          setError("Document not found");
          setLoading(false);
          return;
        }
        const data = await res.json();
        const e: HistoryEntry = data.entry;
        setEntry(e);
        setBlocks(e.blocks);
      } catch {
        setError("Failed to load document");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleBlocksChange = useCallback(
    async (updatedBlocks: OCRBlock[]) => {
      setBlocks(updatedBlocks);
      try {
        await fetch(`/api/history/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: updatedBlocks }),
        });
      } catch {
        /* silent */
      }
    },
    [id]
  );

  const matchCount = highlightedBlockIds.size;

  return (
    <main className="flex flex-col min-h-screen">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
              <h1 className="text-lg font-bold tracking-tight">
                Classical Chinese OCR
              </h1>
            </Link>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Powered by Gemini
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`}>
              <Button variant="outline" size="sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1.5"
                >
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                Back to Search
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {query && (
        <div className="border-b bg-fuchsia-50/50">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-fuchsia-500 shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="text-sm">
              Search: <strong className="font-semibold">{query}</strong>
            </span>
            {matchCount > 0 && (
              <Badge variant="outline" className="text-xs text-fuchsia-600 border-fuchsia-300">
                {matchCount} matched block{matchCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {entry && (
              <span className="text-xs text-muted-foreground ml-auto">
                {entry.filename}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto w-full px-4 py-6">
          {loading && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Loading document...</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

          {!loading && entry && (
            <OCRWorkspace
              imageUrl={`/api/history/${entry.id}/image`}
              blocks={blocks}
              onBlocksChange={handleBlocksChange}
              highlightedBlockIds={highlightedBlockIds}
            />
          )}
        </div>
      </div>
    </main>
  );
}
