"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { OCRBlock } from "@/lib/types";

interface DownloadButtonProps {
  blocks: OCRBlock[];
  disabled?: boolean;
}

export function DownloadButton({ blocks, disabled }: DownloadButtonProps) {
  const handleDownload = useCallback(() => {
    const text = blocks.map((b) => b.text).join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocr-result-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [blocks]);

  const handleCopy = useCallback(async () => {
    const text = blocks.map((b) => b.text).join("\n\n");
    await navigator.clipboard.writeText(text);
  }, [blocks]);

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        disabled={disabled || blocks.length === 0}
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
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        Copy
      </Button>
      <Button
        size="sm"
        onClick={handleDownload}
        disabled={disabled || blocks.length === 0}
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download .txt
      </Button>
    </div>
  );
}
