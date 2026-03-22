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
    <main className="flex flex-col h-screen overflow-hidden">
      <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="seal-stamp text-lg">
                文
              </div>
              <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                玩轉古文
              </h1>
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Powered by Gemini
            </span>
          </div>
          <div className="flex items-center gap-3">
            {entry && (
              <div className="flex items-center gap-3 mr-2">
                <span className="text-base text-muted-foreground hidden sm:inline">
                  {entry.filename}
                </span>
                {entry.modelName && (
                  <Badge variant="outline" className="text-sm font-mono">
                    {entry.modelName}
                  </Badge>
                )}
              </div>
            )}
            <Link href="/graph">
              <Button variant="outline" size="default">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
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
              <Button variant="outline" size="default">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Search
              </Button>
            </Link>
            <Button
              variant={showHistory ? "secondary" : "outline"}
              size="default"
              onClick={() => setShowHistory(!showHistory)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l4 2" />
              </svg>
              History
              {history.length > 0 && (
                <span className="ml-1.5 text-sm text-muted-foreground">
                  ({history.length})
                </span>
              )}
            </Button>
            <Link href="/">
              <Button variant="outline" size="default">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
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

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="max-w-7xl mx-auto w-full px-6 py-4 h-full flex flex-col">
            {loading && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-base">Loading document...</p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-base border border-destructive/20">
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
