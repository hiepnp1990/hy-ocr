"use client";

import { useCallback } from "react";
import type { OCRBlock } from "@/lib/types";

interface BoundingBoxOverlayProps {
  blocks: OCRBlock[];
  selectedBlockId: string | null;
  editedBlockIds: Set<string>;
  onBlockSelect: (blockId: string) => void;
  containerWidth: number;
  containerHeight: number;
}

export function BoundingBoxOverlay({
  blocks,
  selectedBlockId,
  editedBlockIds,
  onBlockSelect,
  containerWidth,
  containerHeight,
}: BoundingBoxOverlayProps) {
  const scaleX = containerWidth / 1000;
  const scaleY = containerHeight / 1000;

  const getBoxColor = useCallback(
    (block: OCRBlock) => {
      if (block.id === selectedBlockId) return { stroke: "#2563eb", fill: "rgba(37, 99, 235, 0.12)" };
      if (editedBlockIds.has(block.id)) return { stroke: "#16a34a", fill: "rgba(22, 163, 74, 0.08)" };
      return { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.06)" };
    },
    [selectedBlockId, editedBlockIds]
  );

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={containerWidth}
      height={containerHeight}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
    >
      {blocks.map((block) => {
        const { stroke, fill } = getBoxColor(block);
        const x = block.bbox.x * scaleX;
        const y = block.bbox.y * scaleY;
        const w = block.bbox.width * scaleX;
        const h = block.bbox.height * scaleY;

        return (
          <rect
            key={block.id}
            x={x}
            y={y}
            width={w}
            height={h}
            stroke={stroke}
            strokeWidth={block.id === selectedBlockId ? 2.5 : 1.5}
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
