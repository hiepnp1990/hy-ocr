"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelected: (dataUrl: string, mimeType: string, filename?: string) => void;
  onTextSelected?: (text: string, filename: string) => void;
  disabled?: boolean;
}

export function ImageUpload({ onImageSelected, onTextSelected, disabled }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (file.name.endsWith(".txt") || file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          onTextSelected?.(text, file.name);
        };
        reader.readAsText(file);
        return;
      }
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        alert("Please upload a JPG, PNG image, or TXT file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onImageSelected(dataUrl, file.type, file.name);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected, onTextSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,.txt,text/plain";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  return (
    <Card
      className={`flex flex-col items-center justify-center gap-4 border-2 border-dashed p-12 transition-colors cursor-pointer ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <div className="rounded-full bg-muted p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-lg font-medium">
          Drop your file here
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Supports JPG, PNG images and TXT files
        </p>
      </div>
      <Button variant="secondary" size="sm" disabled={disabled}>
        Browse Files
      </Button>
    </Card>
  );
}
