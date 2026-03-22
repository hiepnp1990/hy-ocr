"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results ?? []);
      }
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isSearching) {
        handleSearch();
      }
    },
    [handleSearch, isSearching]
  );

  return (
    <main className="flex flex-col min-h-screen">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
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
                玩轉古文
              </h1>
            </Link>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Powered by Gemini
            </span>
          </div>
          <div className="flex items-center gap-2">
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
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                OCR
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Semantic Search
          </h2>
          <p className="text-muted-foreground text-sm">
            Search across all your processed documents by meaning, themes, or content.
          </p>
        </div>

        <div className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="E.g. 論語中關於仁的論述, poems about autumn, 道德經..."
              className="pl-10 h-11 text-base"
              disabled={isSearching}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="h-11 px-6"
          >
            {isSearching ? (
              <>
                <svg
                  className="animate-spin mr-1.5 h-4 w-4"
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
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
            {error}
          </div>
        )}

        {hasSearched && results.length === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3 opacity-40"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-sm">No matching documents found.</p>
            <p className="text-xs mt-1">Try a different query or add more entries first.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {results.length} result{results.length !== 1 && "s"} found
            </p>

            {results.map((result) => {
              const isText = result.kind === "text";
              const detailHref = isText
                ? `/text/${result.id}?q=${encodeURIComponent(query)}&paragraphs=${result.matchedBlockIndices.join(",")}`
                : `/search/${result.id}?q=${encodeURIComponent(query)}&blocks=${result.matchedBlockIndices.join(",")}`;
              return (
              <Link key={result.id} href={detailHref}>
                <Card className="p-4 hover:bg-muted/40 transition-colors cursor-pointer group">
                  <div className="flex gap-4">
                    {isText ? (
                      <div className="w-14 h-14 rounded-md bg-muted shrink-0 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-muted-foreground"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                          <path d="M14 2v6h6" />
                          <path d="M16 13H8" />
                          <path d="M16 17H8" />
                          <path d="M10 9H8" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/history/${result.id}/image`}
                          alt={result.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                          {result.filename}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0 font-mono"
                        >
                          {Math.round(result.score * 100)}%
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs shrink-0"
                        >
                          {isText ? "Text" : "OCR"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 font-serif">
                        {result.matchedSnippet}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {isText ? `${result.blockCount} paragraph${result.blockCount !== 1 ? "s" : ""}` : `${result.blockCount} blocks`}
                        </span>
                        {result.matchedBlockIndices.length > 0 && (
                          <span className="text-xs text-fuchsia-600">
                            {result.matchedBlockIndices.length} matched
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
              );
            })}
          </div>
        )}

        {!hasSearched && (
          <div className="text-center py-12 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3 opacity-30"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-sm">Type a query and press Enter or click Search.</p>
            <p className="text-xs mt-1">
              Searches by meaning across all your documents and text entries.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
