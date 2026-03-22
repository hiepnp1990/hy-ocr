"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BoundingBoxOverlay } from "./bounding-box-overlay";
import { TextEditor } from "./text-editor";
import { DownloadButton } from "./download-button";
import type { OCRBlock } from "@/lib/types";

interface OCRWorkspaceProps {
  imageUrl: string;
  blocks: OCRBlock[];
  onBlocksChange: (blocks: OCRBlock[]) => void;
  highlightedBlockIds?: Set<string>;
  modelName?: string;
}

export function OCRWorkspace({ imageUrl, blocks, onBlocksChange, highlightedBlockIds, modelName }: OCRWorkspaceProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editedBlockIds, setEditedBlockIds] = useState<Set<string>>(new Set());
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (imageContainerRef.current) {
        const img = imageContainerRef.current.querySelector("img");
        if (img) {
          setImageDimensions({
            width: img.clientWidth,
            height: img.clientHeight,
          });
        }
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [imageUrl]);

  const handleBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId((prev) => (prev === blockId ? null : blockId));
  }, []);

  const handleBlockTextChange = useCallback(
    (blockId: string, newText: string) => {
      const updated = blocks.map((b) =>
        b.id === blockId ? { ...b, text: newText } : b
      );
      onBlocksChange(updated);
      setEditedBlockIds((prev) => new Set(prev).add(blockId));
    },
    [blocks, onBlocksChange]
  );

  const handleImageLoad = useCallback(() => {
    if (imageContainerRef.current) {
      const img = imageContainerRef.current.querySelector("img");
      if (img) {
        setImageDimensions({
          width: img.clientWidth,
          height: img.clientHeight,
        });
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold tracking-wide" style={{ fontFamily: "var(--font-heading)" }}>OCR Results</h2>
          {modelName && (
            <Badge variant="secondary" className="text-sm font-mono">
              {modelName}
            </Badge>
          )}
        </div>
        <DownloadButton blocks={blocks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <Card className="relative overflow-auto p-0">
          <div className="p-4 border-b-2">
            <h3 className="text-base font-medium text-muted-foreground">
              Original Image
            </h3>
          </div>
          <div className="p-5 overflow-auto">
            <div ref={imageContainerRef} className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Scanned document"
                className="max-w-full h-auto block"
                onLoad={handleImageLoad}
              />
              {imageDimensions.width > 0 && (
                <BoundingBoxOverlay
                  blocks={blocks}
                  selectedBlockId={selectedBlockId}
                  editedBlockIds={editedBlockIds}
                  highlightedBlockIds={highlightedBlockIds}
                  onBlockSelect={handleBlockSelect}
                  containerWidth={imageDimensions.width}
                  containerHeight={imageDimensions.height}
                />
              )}
            </div>
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden p-0">
          <div className="p-4 border-b-2 flex items-center justify-between">
            <h3 className="text-base font-medium text-muted-foreground">
              Recognized Text
            </h3>
            {editedBlockIds.size > 0 && (
              <span className="text-sm text-jade">
                {editedBlockIds.size} edited
              </span>
            )}
          </div>
          <Separator />
          <div className="flex-1 min-h-0">
            <TextEditor
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              editedBlockIds={editedBlockIds}
              highlightedBlockIds={highlightedBlockIds}
              onBlockSelect={handleBlockSelect}
              onBlockTextChange={handleBlockTextChange}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
