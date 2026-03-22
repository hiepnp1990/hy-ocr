"use client";

import { useCallback } from "react";
import type { OCRBlock } from "@/lib/types";

interface BoundingBoxOverlayProps {
  blocks: OCRBlock[];
  selectedBlockId: string | null;
  editedBlockIds: Set<string>;
  highlightedBlockIds?: Set<string>;
  onBlockSelect: (blockId: string) => void;
  containerWidth: number;
  containerHeight: number;
}

export function BoundingBoxOverlay({
  blocks,
  selectedBlockId,
  editedBlockIds,
  highlightedBlockIds,
  onBlockSelect,
  containerWidth,
  containerHeight,
}: BoundingBoxOverlayProps) {
  const scaleX = containerWidth;
  const scaleY = containerHeight;

  const getBoxColor = useCallback(
    (block: OCRBlock) => {
      if (block.id === selectedBlockId) return { stroke: "#2563eb", fill: "rgba(37, 99, 235, 0.12)" };
      if (highlightedBlockIds?.has(block.id)) return { stroke: "#d946ef", fill: "rgba(217, 70, 239, 0.15)" };
      if (editedBlockIds.has(block.id)) return { stroke: "#16a34a", fill: "rgba(22, 163, 74, 0.08)" };
      return { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.06)" };
    },
    [selectedBlockId, editedBlockIds, highlightedBlockIds]
  );

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={containerWidth}
      height={containerHeight}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
    >
      {blocks.map((block) => {
        const bx = Number(block.bbox?.x) || 0;
        const by = Number(block.bbox?.y) || 0;
        const bw = Number(block.bbox?.width) || 0;
        const bh = Number(block.bbox?.height) || 0;
        if (bw === 0 || bh === 0) return null;

        const { stroke, fill } = getBoxColor(block);
        const x = bx * scaleX;
        const y = by * scaleY;
        const w = bw * scaleX;
        const h = bh * scaleY;

        return (
          <rect
            key={block.id}
            x={x}
            y={y}
            width={w}
            height={h}
            stroke={stroke}
            strokeWidth={block.id === selectedBlockId ? 2.5 : highlightedBlockIds?.has(block.id) ? 2 : 1.5}
            fill={fill}
            rx={2}
            className="pointer-events-auto cursor-pointer transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onBlockSelect(block.id);
            }}
          />
        );
      })}
    </svg>
  );
}
