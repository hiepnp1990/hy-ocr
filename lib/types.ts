/** All values are proportions of the image dimension (0.000–1.000, 3 decimal places). */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRBlock {
  id: string;
  text: string;
  bbox: BoundingBox;
}

export interface OCRResult {
  blocks: OCRBlock[];
  imageWidth: number;
  imageHeight: number;
  modelName?: string;
}

export interface OCRRequest {
  image: string; // base64 data URL
  mimeType: string;
}

export interface OCRResponse {
  success: boolean;
  result?: OCRResult;
  error?: string;
}

export type EntryKind = "ocr" | "text";

export interface HistoryEntry {
  id: string;
  kind: EntryKind;
  filename: string;
  mimeType: string;
  /** Relative path to the saved image inside the data dir (ocr entries only) */
  imagePath: string;
  blocks: OCRBlock[];
  /** Raw text content (text entries only) */
  rawText?: string;
  modelName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryIndex {
  entries: HistoryEntry[];
}

/* ── Knowledge Graph ── */

export type EntityType =
  | "PERSON"
  | "PLACE"
  | "WORK"
  | "ERA"
  | "TITLE"
  | "EVENT"
  | "CONCEPT";

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  description?: string;
  sourceEntryIds: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  description?: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  extractedAt: string;
  sourceEntryIds: string[];
}
