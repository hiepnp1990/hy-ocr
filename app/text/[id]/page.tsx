"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HistorySidebar } from "@/components/history-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { HistoryEntry } from "@/lib/types";

export default function TextDetailPage() {
  return (
    <Suspense>
      <TextDetailInner />
    </Suspense>
  );
}

interface PunctuationChange {
  original: string;
  corrected: string;
  reason: string;
}

function TextDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const showHistory = searchParams.get("history") === "1";

  const [punctuating, setPunctuating] = useState(false);
  const [punctuationChanges, setPunctuationChanges] = useState<PunctuationChange[]>([]);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const [ingesting, setIngesting] = useState(false);
  const [ingestDone, setIngestDone] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setShowHistory = useCallback(
    (show: boolean) => {
      const url = show ? `/text/${id}?history=1` : `/text/${id}`;
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
    setPunctuationChanges([]);
    setIngestDone(false);
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
        setText(e.rawText ?? "");
      } catch {
        setError("Failed to load document");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const saveText = useCallback(
    async (newText: string) => {
      setSaving(true);
      try {
        await fetch(`/api/history/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: newText }),
        });
      } catch {
        /* silent */
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveText(newText), 800);
    },
    [saveText]
  );

  const handlePunctuate = useCallback(async () => {
    if (!text.trim()) return;
    setPunctuating(true);
    setPunctuationChanges([]);
    setError(null);

    try {
      const res = await fetch("/api/punctuate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setText(data.result.corrected);
        setPunctuationChanges(data.result.changes ?? []);
        await saveText(data.result.corrected);
      } else {
        setError(data.error || "Punctuation correction failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPunctuating(false);
    }
  }, [text, customPrompt, saveText]);

  const handleIngest = useCallback(async () => {
    setIngesting(true);
    setError(null);
    try {
      const res = await fetch("/api/graph/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setIngestDone(true);
      } else {
        setError(data.error || "Graph ingest failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIngesting(false);
    }
  }, [id]);

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
              <span className="text-sm text-muted-foreground hidden sm:inline mr-2">
                {entry.filename}
              </span>
            )}
            <Link href="/graph">
              <Button variant="outline" size="sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
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
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                  <path d="M5 12h14" /><path d="M12 5v14" />
                </svg>
                New
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
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold tracking-tight">Text Editor</h2>
                    <Badge variant="secondary" className="text-xs">
                      {text.length} chars
                    </Badge>
                    {saving && (
                      <span className="text-xs text-muted-foreground">Saving...</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = entry.filename.replace(/\.[^.]+$/, "") + "-edited.txt";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download .txt
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Text editor */}
                  <Card className="flex flex-col p-0 overflow-hidden">
                    <div className="p-3 border-b">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Document Text
                      </h3>
                    </div>
                    <div className="flex-1 p-4">
                      <Textarea
                        value={text}
                        onChange={(e) => handleTextChange(e.target.value)}
                        className="min-h-[500px] resize-y text-base leading-relaxed font-serif"
                        placeholder="Text content..."
                      />
                    </div>
                  </Card>

                  {/* Right: Actions panel */}
                  <div className="flex flex-col gap-4">
                    {/* Punctuation correction */}
                    <Card className="flex flex-col p-0 overflow-hidden">
                      <div className="p-3 border-b flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Punctuation Check & Correct
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setShowPromptEditor((v) => !v)}
                        >
                          {showPromptEditor ? "Hide Prompt" : "Custom Prompt"}
                        </Button>
                      </div>
                      <div className="p-4 flex flex-col gap-3">
                        {showPromptEditor && (
                          <Textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="Enter a custom system prompt for punctuation correction, or leave empty to use the default..."
                            className="min-h-[120px] resize-y text-sm"
                          />
                        )}
                        <Button
                          onClick={handlePunctuate}
                          disabled={punctuating || !text.trim()}
                          size="sm"
                        >
                          {punctuating ? (
                            <>
                              <svg className="animate-spin mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Checking...
                            </>
                          ) : (
                            "Check & Correct Punctuation"
                          )}
                        </Button>

                        {punctuationChanges.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <Separator />
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium">Changes Made</h4>
                              <Badge variant="secondary" className="text-xs">
                                {punctuationChanges.length}
                              </Badge>
                            </div>
                            <ScrollArea className="max-h-[200px]">
                              <div className="flex flex-col gap-2">
                                {punctuationChanges.map((change, i) => (
                                  <div key={i} className="rounded border p-2 text-sm">
                                    <div className="flex gap-2 items-start">
                                      <span className="text-red-500 line-through font-serif">{change.original}</span>
                                      <span className="text-muted-foreground">&rarr;</span>
                                      <span className="text-green-600 font-serif">{change.corrected}</span>
                                    </div>
                                    {change.reason && (
                                      <p className="text-xs text-muted-foreground mt-1">{change.reason}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {punctuationChanges.length === 0 && !punctuating && text.trim() && punctuationChanges !== null && (
                          <p className="text-xs text-muted-foreground">
                            Click the button above to auto-detect and correct punctuation using AI.
                          </p>
                        )}
                      </div>
                    </Card>

                    {/* Knowledge graph ingest */}
                    <Card className="flex flex-col p-0 overflow-hidden">
                      <div className="p-3 border-b">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Knowledge Graph
                        </h3>
                      </div>
                      <div className="p-4 flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                          Extract entities and relationships from this text and merge into the knowledge graph.
                        </p>
                        <Button
                          onClick={handleIngest}
                          disabled={ingesting || !text.trim()}
                          variant={ingestDone ? "secondary" : "default"}
                          size="sm"
                        >
                          {ingesting ? (
                            <>
                              <svg className="animate-spin mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Ingesting...
                            </>
                          ) : ingestDone ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-green-600">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                              Ingested
                            </>
                          ) : (
                            "Ingest to Knowledge Graph"
                          )}
                        </Button>
                        {ingestDone && (
                          <Link href="/graph">
                            <Button variant="outline" size="sm" className="w-full">
                              View Knowledge Graph
                            </Button>
                          </Link>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
