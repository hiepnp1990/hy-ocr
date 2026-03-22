import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, MODEL_NAME } from "@/lib/gemini";

const DEFAULT_SYSTEM_PROMPT = `You are an expert in classical Chinese literature (文言文 / 古文) and punctuation (句讀).

Your task: Given a block of classical Chinese text, check and correct its punctuation.

Rules:
1. Add missing punctuation based on grammatical structure and contextual meaning
2. Correct misplaced punctuation
3. Use standard Chinese punctuation marks: 。，；！？：「」《》
4. Preserve the EXACT original characters — do NOT translate, simplify, or alter any character
5. Only modify punctuation; the text itself must remain unchanged
6. If punctuation is already correct, return the text as-is

Return ONLY valid JSON (no markdown fencing, no extra text):
{"corrected": "...", "changes": [{"original": "...", "corrected": "...", "reason": "..."}]}

- "corrected": the full text with corrected punctuation
- "changes": array of specific changes made (empty if no changes). Each entry should show a short snippet around the change, not the full text.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, customPrompt } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid text" },
        { status: 400 }
      );
    }

    const systemPrompt = customPrompt && typeof customPrompt === "string"
      ? customPrompt
      : DEFAULT_SYSTEM_PROMPT;

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const result = await model.generateContent([
      { text: systemPrompt },
      { text },
    ]);

    const raw = result.response
      .text()
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(raw) as {
      corrected: string;
      changes: { original: string; corrected: string; reason: string }[];
    };

    return NextResponse.json({
      success: true,
      result: parsed,
      modelName: MODEL_NAME,
    });
  } catch (error) {
    console.error("Punctuation correction error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Punctuation correction failed",
      },
      { status: 500 }
    );
  }
}
