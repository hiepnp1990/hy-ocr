"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ImageUpload } from "@/components/image-upload";
import { HistorySidebar } from "@/components/history-sidebar";
import { Button } from "@/components/ui/button";
import type { OCRBlock, OCRResponse, HistoryEntry } from "@/lib/types";

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("");
  const [blocks, setBlocks] = useState<OCRBlock[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasResults, setHasResults] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

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
    const loadId = searchParams.get("load");
    if (!loadId) return;
    router.replace(`/ocr/${loadId}`);
  }, [searchParams, router]);

  const saveToHistory = useCallback(
    async (img: string, mime: string, filename: string, ocrBlocks: OCRBlock[], modelName?: string) => {
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename,
            mimeType: mime,
            image: img,
            blocks: ocrBlocks,
            modelName,
          }),
        });
        const data = await res.json();
        if (data.entry) {
          setActiveHistoryId(data.entry.id);
          fetch("/api/graph/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entryId: data.entry.id }),
          }).catch(() => {});
        }
        await loadHistory();
        return data.entry?.id as string | undefined;
      } catch {
        /* silent */
        return undefined;
      }
    },
    [loadHistory]
  );

  const handleImageSelected = useCallback(
    (dataUrl: string, type: string, filename?: string) => {
      setImageUrl(dataUrl);
      setMimeType(type);
      setImageFilename(filename || `scan-${Date.now()}`);
      setBlocks([]);
      setError(null);
      setHasResults(false);
      setActiveHistoryId(null);
    },
    []
  );

  const handleRunOCR = useCallback(async () => {
    if (!imageUrl) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageUrl, mimeType }),
      });

      const data: OCRResponse = await res.json();

      if (data.success && data.result) {
        setBlocks(data.result.blocks);
        setHasResults(true);
        const entryId = await saveToHistory(
          imageUrl, mimeType, imageFilename,
          data.result.blocks, data.result.modelName
        );
        if (entryId) {
          router.push(`/ocr/${entryId}`);
        }
      } else {
        setError(data.error || "OCR processing failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, mimeType, imageFilename, saveToHistory, router]);

  const handleReset = useCallback(() => {
    setImageUrl(null);
    setMimeType("");
    setImageFilename("");
    setBlocks([]);
    setError(null);
    setHasResults(false);
    setActiveHistoryId(null);
  }, []);

  const handleLoadFromHistory = useCallback((entry: HistoryEntry) => {
    if (entry.blocks.length > 0) {
      router.push(`/ocr/${entry.id}`);
    } else {
      setImageUrl(`/api/history/${entry.id}/image`);
      setMimeType(entry.mimeType);
      setImageFilename(entry.filename);
      setBlocks(entry.blocks);
      setHasResults(false);
      setActiveHistoryId(entry.id);
      setError(null);
    }
  }, [router]);

  const handleDeleteFromHistory = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/history/${id}`, { method: "DELETE" });
        await loadHistory();
        if (activeHistoryId === id) {
          handleReset();
        }
      } catch {
        /* silent */
      }
    },
    [loadHistory, activeHistoryId, handleReset]
  );

  return (
    <main className="flex flex-col min-h-screen">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
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
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Powered by Gemini
            </span>
          </div>

          <div className="flex items-center gap-2">
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
                  <path d="M12 2v4" /><path d="M12 18v4" />
                  <path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" />
                  <path d="M2 12h4" /><path d="M18 12h4" />
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
              onClick={() => setShowHistory((v) => !v)}
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
            {imageUrl && (
              <>
                <Button
                  onClick={handleRunOCR}
                  disabled={isProcessing}
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <svg
                        className="animate-spin mr-1.5 h-3.5 w-3.5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    "Run OCR"
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Reset
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {showHistory && (
          <HistorySidebar
            entries={history}
            activeEntryId={activeHistoryId}
            onLoad={handleLoadFromHistory}
            onDelete={handleDeleteFromHistory}
            onClose={() => setShowHistory(false)}
          />
        )}

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full px-4 py-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {error}
              </div>
            )}

            {!imageUrl ? (
              <div className="max-w-xl mx-auto mt-16">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold tracking-tight mb-2">
                    Upload a Scanned Document
                  </h2>
                  <p className="text-muted-foreground">
                    Upload a scanned image of classical Chinese literature to
                    extract and edit text using AI-powered OCR.
                  </p>
                </div>
                <ImageUpload
                  onImageSelected={handleImageSelected}
                  disabled={isProcessing}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 mt-8">
                <div className="max-w-2xl w-full">
                  <div className="rounded-lg border overflow-hidden bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Uploaded document"
                      className="max-w-full h-auto mx-auto max-h-[60vh] object-contain"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    {isProcessing ? (
                      "Processing OCR... You will be redirected when complete."
                    ) : hasResults ? (
                      "Redirecting to results..."
                    ) : (
                      <>Image uploaded. Click <strong>Run OCR</strong> to extract text.</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
