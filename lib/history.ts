import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import type { HistoryEntry, HistoryIndex, OCRBlock } from "./types";
import { removeEntryFromGraph } from "./knowledge-graph";

const DATA_DIR = join(process.cwd(), ".data");
const IMAGES_DIR = join(DATA_DIR, "images");
const INDEX_FILE = join(DATA_DIR, "history.json");

function ensureDirs() {
  mkdirSync(IMAGES_DIR, { recursive: true });
}

function readIndex(): HistoryIndex {
  ensureDirs();
  if (!existsSync(INDEX_FILE)) {
    return { entries: [] };
  }
  const raw = readFileSync(INDEX_FILE, "utf-8");
  const idx = JSON.parse(raw) as HistoryIndex;
  for (const e of idx.entries) {
    if (!e.kind) e.kind = "ocr";
  }
  return idx;
}

function writeIndex(index: HistoryIndex) {
  ensureDirs();
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), "utf-8");
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function getAllHistory(): HistoryEntry[] {
  return readIndex().entries.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getHistoryEntry(id: string): HistoryEntry | null {
  const index = readIndex();
  return index.entries.find((e) => e.id === id) ?? null;
}

export function saveHistoryEntry(
  filename: string,
  mimeType: string,
  imageDataUrl: string,
  blocks: OCRBlock[],
  modelName?: string
): HistoryEntry {
  ensureDirs();
  const index = readIndex();

  const base64Data = imageDataUrl.includes(",")
    ? imageDataUrl.split(",")[1]
    : imageDataUrl;
  const imageHash = hashString(base64Data.slice(0, 2000));
  const ext = mimeType === "image/png" ? "png" : "jpg";

  const existing = index.entries.find((e) => e.id === imageHash);
  const now = new Date().toISOString();

  if (existing) {
    existing.blocks = blocks;
    existing.updatedAt = now;
    existing.filename = filename;
    if (modelName) existing.modelName = modelName;
    writeIndex(index);
    return existing;
  }

  const imageFilename = `${imageHash}.${ext}`;
  const imagePath = join(IMAGES_DIR, imageFilename);
  writeFileSync(imagePath, Buffer.from(base64Data, "base64"));

  const entry: HistoryEntry = {
    id: imageHash,
    kind: "ocr",
    filename,
    mimeType,
    imagePath: `images/${imageFilename}`,
    blocks,
    modelName,
    createdAt: now,
    updatedAt: now,
  };

  index.entries.push(entry);
  writeIndex(index);
  return entry;
}

export function saveTextEntry(
  filename: string,
  rawText: string
): HistoryEntry {
  ensureDirs();
  const index = readIndex();
  const textHash = hashString(rawText.slice(0, 2000));
  const existing = index.entries.find((e) => e.id === textHash);
  const now = new Date().toISOString();

  if (existing) {
    existing.rawText = rawText;
    existing.updatedAt = now;
    existing.filename = filename;
    writeIndex(index);
    return existing;
  }

  const entry: HistoryEntry = {
    id: textHash,
    kind: "text",
    filename,
    mimeType: "text/plain",
    imagePath: "",
    blocks: [],
    rawText,
    createdAt: now,
    updatedAt: now,
  };

  index.entries.push(entry);
  writeIndex(index);
  return entry;
}

export function updateHistoryText(id: string, rawText: string): HistoryEntry | null {
  const index = readIndex();
  const entry = index.entries.find((e) => e.id === id);
  if (!entry) return null;
  entry.rawText = rawText;
  entry.updatedAt = new Date().toISOString();
  writeIndex(index);
  return entry;
}

export function updateHistoryBlocks(id: string, blocks: OCRBlock[]): HistoryEntry | null {
  const index = readIndex();
  const entry = index.entries.find((e) => e.id === id);
  if (!entry) return null;
  entry.blocks = blocks;
  entry.updatedAt = new Date().toISOString();
  writeIndex(index);
  return entry;
}

export function deleteHistoryEntry(id: string): boolean {
  const index = readIndex();
  const entryIdx = index.entries.findIndex((e) => e.id === id);
  if (entryIdx === -1) return false;

  const entry = index.entries[entryIdx];
  if (entry.imagePath) {
    const imagePath = join(DATA_DIR, entry.imagePath);
    if (existsSync(imagePath)) {
      unlinkSync(imagePath);
    }
  }

  index.entries.splice(entryIdx, 1);
  writeIndex(index);

  removeEntryFromGraph(id);

  return true;
}

export function getImageAbsolutePath(entry: HistoryEntry): string {
  return join(DATA_DIR, entry.imagePath);
}
