import { NextRequest, NextResponse } from "next/server";

/**
 * 문서 파싱 API (kordoc 연동)
 * HWP, PDF 등 한국 문서 형식을 텍스트로 변환합니다.
 *
 * POST body: multipart/form-data
 *   - file: 업로드할 문서 파일 (HWP, PDF, DOCX)
 */

const SUPPORTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/x-hwp": [".hwp"],
  "application/haansofthwp": [".hwp"],
  "application/vnd.hancom.hwp": [".hwp"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/msword": [".doc"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일(file)이 필요합니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기가 10MB를 초과합니다." },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const ext = "." + (fileName.split(".").pop() || "");
    const allExts = Object.values(SUPPORTED_TYPES).flat();
    const isSupported =
      allExts.includes(ext) ||
      Object.keys(SUPPORTED_TYPES).includes(file.type);

    if (!isSupported) {
      return NextResponse.json(
        {
          error: `지원하지 않는 파일 형식입니다. 지원 형식: HWP, PDF, DOCX\n파일명: ${file.name}\nMIME: ${file.type}`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";

    if (ext === ".pdf") {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
      } catch {
        text = extractTextFromBuffer(buffer);
      }
    } else if (ext === ".hwp") {
      try {
        const kordoc = await import("kordoc");
        if (kordoc.parseHwp) {
          const result = await kordoc.parseHwp(buffer);
          text =
            typeof result === "string"
              ? result
              : result?.text || JSON.stringify(result);
        } else if (kordoc.default?.parseHwp) {
          const result = await kordoc.default.parseHwp(buffer);
          text =
            typeof result === "string"
              ? result
              : result?.text || JSON.stringify(result);
        } else {
          text = extractTextFromBuffer(buffer);
        }
      } catch {
        text = extractTextFromBuffer(buffer);
      }
    } else if (ext === ".docx" || ext === ".doc") {
      text = extractTextFromBuffer(buffer);
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        fileName: file.name,
        fileSize: file.size,
        text: "",
        warning:
          "문서에서 텍스트를 추출할 수 없습니다. 스캔 이미지 기반 문서일 수 있습니다.",
      });
    }

    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      textLength: text.length,
      text,
    });
  } catch (error: unknown) {
    console.error("Document parse error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `문서 파싱 중 오류가 발생했습니다.\n\n상세: ${errMsg}` },
      { status: 500 }
    );
  }
}

/**
 * 바이너리 버퍼에서 읽을 수 있는 텍스트를 추출합니다 (fallback).
 */
function extractTextFromBuffer(buffer: Buffer): string {
  const raw = buffer.toString("utf-8");
  const lines: string[] = [];
  let currentLine = "";

  for (const char of raw) {
    const code = char.charCodeAt(0);
    if (
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0x3131 && code <= 0x318e) ||
      (code >= 0x20 && code <= 0x7e) ||
      char === "\n" ||
      char === "\t"
    ) {
      if (char === "\n") {
        if (currentLine.trim().length > 0) {
          lines.push(currentLine.trim());
        }
        currentLine = "";
      } else {
        currentLine += char;
      }
    }
  }

  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trim());
  }

  return lines.join("\n");
}
