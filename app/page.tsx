"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ImageUpload } from "@/components/image-upload";
import { BatchUpload } from "@/components/batch-upload";
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

  const [uploadMode, setUploadMode] = useState<"single" | "batch">("single");

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
    (async () => {
      try {
        const res = await fetch(`/api/history/${loadId}`);
        if (!res.ok) return;
        const data = await res.json();
        const route = data.entry?.kind === "text" ? "text" : "ocr";
        router.replace(`/${route}/${loadId}`);
      } catch {
        router.replace(`/ocr/${loadId}`);
      }
    })();
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

  const handleTextSelected = useCallback(
    async (text: string, filename: string) => {
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "text", filename, rawText: text }),
        });
        const data = await res.json();
        if (data.entry) {
          await loadHistory();
          router.push(`/text/${data.entry.id}`);
        }
      } catch {
        setError("Failed to save text file");
      }
    },
    [loadHistory, router]
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
    if (entry.kind === "text") {
      router.push(`/text/${entry.id}`);
    } else if (entry.blocks.length > 0) {
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
      <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="seal-stamp text-lg">
                文
              </div>
              <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>
                玩轉古文
              </h1>
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Powered by Gemini
            </span>
          </div>

          <div className="flex items-center gap-3">
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
                  <path d="M12 2v4" /><path d="M12 18v4" />
                  <path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" />
                  <path d="M2 12h4" /><path d="M18 12h4" />
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
              onClick={() => setShowHistory((v) => !v)}
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
            {imageUrl && (
              <>
                <Button
                  onClick={handleRunOCR}
                  disabled={isProcessing}
                  size="default"
                >
                  {isProcessing ? (
                    <>
                      <svg
                        className="animate-spin mr-2 h-4 w-4"
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
                <Button variant="ghost" size="default" onClick={handleReset}>
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
          <div className="max-w-7xl mx-auto w-full px-6 py-8">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-base border border-destructive/20">
                {error}
              </div>
            )}

            {!imageUrl ? (
              <div className="max-w-2xl mx-auto mt-12">
                <div className="text-center mb-10">
                  <div className="inline-block mb-6">
                    <div className="seal-stamp text-2xl px-4 py-1" style={{ fontFamily: "var(--font-heading)" }}>
                      古文識讀
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold tracking-wide mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                    Upload a Scanned Document
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Upload a scanned image of classical Chinese literature to
                    extract and edit text using AI-powered OCR.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-1 mb-8 p-1.5 rounded-lg bg-muted w-fit mx-auto">
                  <button
                    className={`px-6 py-2.5 text-base font-medium rounded-md transition-colors ${
                      uploadMode === "single"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setUploadMode("single")}
                  >
                    Single File
                  </button>
                  <button
                    className={`px-6 py-2.5 text-base font-medium rounded-md transition-colors ${
                      uploadMode === "batch"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setUploadMode("batch")}
                  >
                    Multiple Files
                  </button>
                </div>

                {uploadMode === "single" ? (
                  <ImageUpload
                    onImageSelected={handleImageSelected}
                    onTextSelected={handleTextSelected}
                    disabled={isProcessing}
                  />
                ) : (
                  <BatchUpload onProcessed={loadHistory} />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-8 mt-8">
                <div className="max-w-3xl w-full">
                  <div className="rounded-lg border-2 overflow-hidden bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Uploaded document"
                      className="max-w-full h-auto mx-auto max-h-[65vh] object-contain"
                    />
                  </div>
                  <p className="text-base text-muted-foreground text-center mt-4">
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
