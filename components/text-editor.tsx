"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  const MAX_VISIBLE_BLOCKS = 5;
  const APPROX_BLOCK_HEIGHT_PX = 148;
  const BLOCK_GAP_PX = 16;
  const LIST_MAX_HEIGHT =
    MAX_VISIBLE_BLOCKS * APPROX_BLOCK_HEIGHT_PX + (MAX_VISIBLE_BLOCKS - 1) * BLOCK_GAP_PX;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useLayoutEffect(() => {
    if (selectedBlockId && scrollContainerRef.current) {
      const el = blockRefs.current.get(selectedBlockId);
      if (el) {
        const container = scrollContainerRef.current;
        requestAnimationFrame(() => {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const targetScrollTop =
            container.scrollTop +
            (elRect.top - containerRect.top) -
            container.clientHeight / 2 +
            elRect.height / 2;

          container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
        });
      }
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
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex items-center justify-between p-5 pb-3 shrink-0">
        <h3 className="text-base font-semibold tracking-tight">
          Detected Text Blocks
        </h3>
        <Badge variant="secondary" className="text-sm">
          {blocks.length} blocks
        </Badge>
      </div>
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto px-5 pb-5 min-h-0"
        style={{ maxHeight: `${LIST_MAX_HEIGHT}px` }}
      >
        <div className="flex flex-col gap-4">
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
      </div>
    </div>
  );
}
