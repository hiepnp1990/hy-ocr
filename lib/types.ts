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
