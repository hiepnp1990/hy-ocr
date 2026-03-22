"use client";

import { useCallback, useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { OCRWorkspace } from "@/components/ocr-workspace";
import { Button } from "@/components/ui/button";
import type { OCRBlock, OCRResponse } from "@/lib/types";

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [blocks, setBlocks] = useState<OCRBlock[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasResults, setHasResults] = useState(false);

  const handleImageSelected = useCallback((dataUrl: string, type: string) => {
    setImageUrl(dataUrl);
    setMimeType(type);
    setBlocks([]);
    setError(null);
    setHasResults(false);
  }, []);

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
      } else {
        setError(data.error || "OCR processing failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, mimeType]);

  const handleReset = useCallback(() => {
    setImageUrl(null);
    setMimeType("");
    setBlocks([]);
    setError(null);
    setHasResults(false);
  }, []);

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

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
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
                Upload a scanned image of classical Chinese literature to extract and edit text using AI-powered OCR.
              </p>
            </div>
            <ImageUpload
              onImageSelected={handleImageSelected}
              disabled={isProcessing}
            />
          </div>
        ) : !hasResults ? (
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
                Image uploaded. Click <strong>Run OCR</strong> to extract text.
              </p>
            </div>
          </div>
        ) : (
          <OCRWorkspace
            imageUrl={imageUrl}
            blocks={blocks}
            onBlocksChange={setBlocks}
          />
        )}
      </div>
    </main>
  );
}
