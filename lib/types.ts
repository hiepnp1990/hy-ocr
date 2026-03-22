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

export interface HistoryEntry {
  id: string;
  filename: string;
  mimeType: string;
  /** Relative path to the saved image inside the data dir */
  imagePath: string;
  blocks: OCRBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface HistoryIndex {
  entries: HistoryEntry[];
}
