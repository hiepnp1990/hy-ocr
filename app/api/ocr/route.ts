import { NextRequest, NextResponse } from "next/server";
import { performOCR, MODEL_NAME } from "@/lib/gemini";
import type { OCRResponse, OCRBlock } from "@/lib/types";

export async function POST(request: NextRequest): Promise<NextResponse<OCRResponse>> {
  try {
    const body = await request.json();
    const { image, mimeType } = body;

    if (!image || !mimeType) {
      return NextResponse.json(
        { success: false, error: "Missing image or mimeType" },
        { status: 400 }
      );
    }

    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const ocrResult = await performOCR(base64Data, mimeType);

    const blocks: OCRBlock[] = ocrResult.blocks.map((block, index) => ({
      id: `block-${index}`,
      text: block.text,
      bbox: block.bbox,
    }));

    return NextResponse.json({
      success: true,
      result: {
        blocks,
        imageWidth: 0,
        imageHeight: 0,
        modelName: MODEL_NAME,
      },
    });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "OCR processing failed",
      },
      { status: 500 }
    );
  }
}
