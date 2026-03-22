"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const MAX_FILES = 15;
const MAX_PARALLEL = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

type FileStatus = "pending" | "processing" | "done" | "error";

interface QueuedFile {
  id: string;
  file: File;
  preview: string;
  status: FileStatus;
  error?: string;
  entryId?: string;
}

interface BatchUploadProps {
  onProcessed?: () => void;
}

export function BatchUpload({ onProcessed }: BatchUploadProps) {
  const router = useRouter();
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const abortRef = useRef(false);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const remaining = MAX_FILES - prev.length;
      if (remaining <= 0) return prev;
      const toAdd = arr.slice(0, remaining);

      const newItems: QueuedFile[] = [];
      for (const file of toAdd) {
        const isText = file.name.endsWith(".txt") || file.type === "text/plain";
        const isImage = ACCEPTED_TYPES.includes(file.type);
        if (!isText && !isImage) continue;

        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          preview: isImage ? URL.createObjectURL(file) : "",
          status: "pending",
        });
      }
      return [...prev, ...newItems];
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearDone = useCallback(() => {
    setFiles((prev) => {
      for (const f of prev) {
        if (f.status === "done" && f.preview) URL.revokeObjectURL(f.preview);
      }
      return prev.filter((f) => f.status !== "done");
    });
  }, []);

  const processFile = async (queued: QueuedFile): Promise<void> => {
    setFiles((prev) =>
      prev.map((f) => (f.id === queued.id ? { ...f, status: "processing" as FileStatus } : f))
    );

    try {
      const isText =
        queued.file.name.endsWith(".txt") || queued.file.type === "text/plain";

      if (isText) {
        const text = await queued.file.text();
        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "text", filename: queued.file.name, rawText: text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save text");
        setFiles((prev) =>
          prev.map((f) =>
            f.id === queued.id
              ? { ...f, status: "done" as FileStatus, entryId: data.entry?.id }
              : f
          )
        );
        return;
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(queued.file);
      });

      const ocrRes = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, mimeType: queued.file.type }),
      });
      const ocrData = await ocrRes.json();

      if (!ocrData.success) throw new Error(ocrData.error || "OCR failed");

      const histRes = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: queued.file.name,
          mimeType: queued.file.type,
          image: dataUrl,
          blocks: ocrData.result.blocks,
          modelName: ocrData.result.modelName,
        }),
      });
      const histData = await histRes.json();
      if (!histRes.ok) throw new Error(histData.error || "Failed to save");

      if (histData.entry) {
        fetch("/api/graph/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId: histData.entry.id }),
        }).catch(() => {});
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === queued.id
            ? { ...f, status: "done" as FileStatus, entryId: histData.entry?.id }
            : f
        )
      );
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === queued.id
            ? {
                ...f,
                status: "error" as FileStatus,
                error: err instanceof Error ? err.message : "Unknown error",
              }
            : f
        )
      );
    }
  };

  const runAll = useCallback(async () => {
    setIsRunning(true);
    abortRef.current = false;

    const pending = files.filter((f) => f.status === "pending" || f.status === "error");
    let idx = 0;

    const runNext = async (): Promise<void> => {
      while (idx < pending.length) {
        if (abortRef.current) return;
        const current = pending[idx++];
        await processFile(current);
      }
    };

    const workers = Array.from(
      { length: Math.min(MAX_PARALLEL, pending.length) },
      () => runNext()
    );
    await Promise.all(workers);
    setIsRunning(false);
    onProcessed?.();
  }, [files, onProcessed]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleBrowse = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,.txt,text/plain";
    input.multiple = true;
    input.onchange = () => {
      if (input.files?.length) addFiles(input.files);
    };
    input.click();
  }, [addFiles]);

  const pendingCount = files.filter((f) => f.status === "pending" || f.status === "error").length;
  const processingCount = files.filter((f) => f.status === "processing").length;
  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="space-y-4">
      <Card
        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed p-8 transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        } ${isRunning ? "opacity-50 pointer-events-none" : ""}`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onClick={handleBrowse}
      >
        <div className="rounded-full bg-muted p-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M16 16h6" />
            <path d="M19 13v6" />
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-medium">
            Drop multiple files here
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Up to {MAX_FILES} files (JPG, PNG, TXT)
            {files.length > 0 && ` — ${files.length}/${MAX_FILES} selected`}
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled={isRunning}>
          Browse Files
        </Button>
      </Card>

      {files.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Files</span>
              <Badge variant="secondary" className="text-xs">
                {files.length}
              </Badge>
              {processingCount > 0 && (
                <Badge variant="default" className="text-xs">
                  {processingCount} processing
                </Badge>
              )}
              {doneCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {doneCount} done
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {doneCount > 0 && !isRunning && (
                <Button variant="ghost" size="sm" onClick={clearDone}>
                  Clear done
                </Button>
              )}
              {files.length > 0 && !isRunning && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    for (const f of files)
                      if (f.preview) URL.revokeObjectURL(f.preview);
                    setFiles([]);
                  }}
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-[420px]">
            <div className="divide-y">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-4 py-2.5 group"
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {f.preview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={f.preview}
                        alt={f.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
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
                      </svg>
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(f.file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>

                  {/* Status */}
                  <div className="shrink-0 flex items-center gap-2">
                    {f.status === "pending" && (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                    {f.status === "processing" && (
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="animate-spin h-3.5 w-3.5 text-primary"
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
                        <span className="text-xs text-primary font-medium">Processing</span>
                      </div>
                    )}
                    {f.status === "done" && (
                      <button
                        className="flex items-center gap-1.5 hover:underline"
                        onClick={() => {
                          if (f.entryId) {
                            const isText =
                              f.file.name.endsWith(".txt") ||
                              f.file.type === "text/plain";
                            router.push(
                              isText ? `/text/${f.entryId}` : `/ocr/${f.entryId}`
                            );
                          }
                        }}
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
                          className="text-green-600"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        <span className="text-xs text-green-600 font-medium">
                          Done — View
                        </span>
                      </button>
                    )}
                    {f.status === "error" && (
                      <div className="flex items-center gap-1.5" title={f.error}>
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
                          className="text-destructive"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span className="text-xs text-destructive font-medium truncate max-w-[120px]">
                          {f.error || "Error"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Remove button (hidden while processing) */}
                  {f.status !== "processing" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFile(f.id)}
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
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer with action button */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {isRunning
                ? `Processing ${processingCount} of ${files.length} files (max ${MAX_PARALLEL} in parallel)`
                : pendingCount > 0
                  ? `${pendingCount} file${pendingCount > 1 ? "s" : ""} ready to process`
                  : doneCount === files.length
                    ? "All files processed"
                    : `${doneCount} done, ${pendingCount} pending`}
            </p>
            <Button
              size="sm"
              disabled={isRunning || pendingCount === 0}
              onClick={runAll}
            >
              {isRunning ? (
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
                `Process ${pendingCount} File${pendingCount !== 1 ? "s" : ""}`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
