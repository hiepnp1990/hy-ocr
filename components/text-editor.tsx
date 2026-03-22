"use client";

import { useCallback, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { OCRBlock } from "@/lib/types";

interface TextEditorProps {
  blocks: OCRBlock[];
  selectedBlockId: string | null;
  editedBlockIds: Set<string>;
  highlightedBlockIds?: Set<string>;
  onBlockSelect: (blockId: string) => void;
  onBlockTextChange: (blockId: string, newText: string) => void;
}

export function TextEditor({
  blocks,
  selectedBlockId,
  editedBlockIds,
  highlightedBlockIds,
  onBlockSelect,
  onBlockTextChange,
}: TextEditorProps) {
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (selectedBlockId) {
      const el = blockRefs.current.get(selectedBlockId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedBlockId]);

  const setBlockRef = useCallback(
    (blockId: string) => (el: HTMLDivElement | null) => {
      if (el) blockRefs.current.set(blockId, el);
      else blockRefs.current.delete(blockId);
    },
    []
  );

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold tracking-tight">
            Detected Text Blocks
          </h3>
          <Badge variant="secondary" className="text-sm">
            {blocks.length} blocks
          </Badge>
        </div>

        {blocks.map((block, index) => {
          const isSelected = block.id === selectedBlockId;
          const isEdited = editedBlockIds.has(block.id);
          const isHighlighted = highlightedBlockIds?.has(block.id) ?? false;

          return (
            <div
              key={block.id}
              ref={setBlockRef(block.id)}
              className={`rounded-lg border-2 p-4 transition-all cursor-pointer ${
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : isHighlighted
                    ? "border-gold ring-2 ring-gold/30 bg-gold/10"
                    : "border-border hover:border-primary/40"
              }`}
              onClick={() => onBlockSelect(block.id)}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-mono text-muted-foreground">
                  #{index + 1}
                </span>
                {isHighlighted && (
                  <Badge variant="outline" className="text-sm text-gold border-gold/40">
                    match
                  </Badge>
                )}
                {isEdited && (
                  <Badge variant="outline" className="text-sm text-jade border-jade/40">
                    edited
                  </Badge>
                )}
              </div>
              <Textarea
                value={block.text}
                onChange={(e) => onBlockTextChange(block.id, e.target.value)}
                className="min-h-[80px] resize-y text-lg leading-relaxed font-serif"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          );
        })}

        {blocks.length === 0 && (
          <p className="text-base text-muted-foreground text-center py-10">
            No text blocks detected yet. Upload an image and run OCR to see results.
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
