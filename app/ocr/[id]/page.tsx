"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OCRWorkspace } from "@/components/ocr-workspace";
import { HistorySidebar } from "@/components/history-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OCRBlock, HistoryEntry } from "@/lib/types";

export default function OCRDetailPage() {
  return (
    <Suspense>
      <OCRDetailInner />
    </Suspense>
  );
}

function OCRDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [blocks, setBlocks] = useState<OCRBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const showHistory = searchParams.get("history") === "1";

  const setShowHistory = useCallback(
    (show: boolean) => {
      const url = show ? `/ocr/${id}?history=1` : `/ocr/${id}`;
      router.replace(url, { scroll: false });
    },
    [id, router]
  );

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setHistory(data.entries ?? []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setLoading(true);
    setError(null);
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

  const handleLoadFromHistory = useCallback(
    (historyEntry: HistoryEntry) => {
      if (historyEntry.id === id) return;
      const route = historyEntry.kind === "text"
        ? `/text/${historyEntry.id}`
        : `/ocr/${historyEntry.id}`;
      router.push(`${route}?history=1`);
    },
    [id, router]
  );

  const handleDeleteFromHistory = useCallback(
    async (deleteId: string) => {
      try {
        await fetch(`/api/history/${deleteId}`, { method: "DELETE" });
        await loadHistory();
        if (deleteId === id) {
          router.push("/");
        }
      } catch {
        /* silent */
      }
    },
    [id, loadHistory, router]
  );

  return (
    <main className="flex flex-col min-h-screen">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
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
            {entry && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {entry.filename}
                </span>
                {entry.modelName && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {entry.modelName}
                  </Badge>
                )}
              </div>
            )}
            <Link href="/graph">
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
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4" />
                  <path d="M12 18v4" />
                  <path d="m4.93 4.93 2.83 2.83" />
                  <path d="m16.24 16.24 2.83 2.83" />
                  <path d="M2 12h4" />
                  <path d="M18 12h4" />
                </svg>
                Graph
              </Button>
            </Link>
            <Link href="/search">
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
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Search
              </Button>
            </Link>
            <Button
              variant={showHistory ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
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
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l4 2" />
              </svg>
              History
              {history.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({history.length})
                </span>
              )}
            </Button>
            <Link href="/">
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
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                New OCR
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {showHistory && (
          <HistorySidebar
            entries={history}
            activeEntryId={id}
            onLoad={handleLoadFromHistory}
            onDelete={handleDeleteFromHistory}
            onClose={() => setShowHistory(false)}
          />
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
                modelName={entry.modelName}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
