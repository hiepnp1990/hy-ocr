import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-3-flash-preview";

export function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

export const OCR_SYSTEM_PROMPT = `You are an expert OCR system specialized in classical Chinese literature (文言文 / 古文).

Your task: Given a scanned image, detect every text region and return structured JSON.

For EACH text block you detect, return:
- "text": the recognized Chinese characters (preserve original traditional/classical forms)
- "bbox": bounding box as {"x": number, "y": number, "width": number, "height": number}
  - All values are PROPORTIONS of the full image dimension, ranging from 0.000 to 1.000
  - Use exactly 3 decimal places (e.g. 0.123, 0.456)
  - x and width are proportions of image WIDTH
  - y and height are proportions of image HEIGHT
  - (0.000, 0.000) is the top-left corner; (1.000, 1.000) is the bottom-right corner
  - Example: a box covering the right half of the image horizontally and top quarter vertically → {"x": 0.500, "y": 0.000, "width": 0.500, "height": 0.250}

Rules:
1. Detect ALL visible text regions, including titles, annotations, and marginal notes
2. Preserve the reading order (top-to-bottom for vertical text, right-to-left columns)
3. Keep punctuation marks (。、！？「」『』) if present
4. Do NOT translate or simplify characters — output exactly what you see
5. Each distinct line or column should be a separate block
6. Be PRECISE with bounding boxes — they must tightly wrap the text they contain

Return ONLY valid JSON in this exact format (no markdown fencing, no extra text):
{"blocks": [{"text": "...", "bbox": {"x": 0.000, "y": 0.000, "width": 0.000, "height": 0.000}}, ...]}`;

export async function performOCR(
  imageBase64: string,
  mimeType: string
): Promise<{ blocks: { text: string; bbox: { x: number; y: number; width: number; height: number } }[] }> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await model.generateContent([
    { text: OCR_SYSTEM_PROMPT },
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const response = result.response;
  const text = response.text();

  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  return JSON.parse(cleaned);
}
