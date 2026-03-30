import { NextRequest, NextResponse } from "next/server";

/**
 * 법령 본문 조회 API (korean-law-mcp 연동)
 * 법령 ID로 법령의 전체 본문(조문)을 조회합니다.
 *
 * @query id - 법령 일련번호
 * @query article - 특정 조문 번호 (선택)
 */

const LAW_API_BASE = "https://www.law.go.kr/DRF/lawService.do";

interface LawArticle {
  조문번호: string;
  조문제목: string;
  조문내용: string;
}

interface LawTextResponse {
  법령명: string;
  법령ID: string;
  시행일자: string;
  소관부처: string;
  조문목록: LawArticle[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lawId = searchParams.get("id");
    const article = searchParams.get("article");

    if (!lawId || lawId.trim().length === 0) {
      return NextResponse.json(
        { error: "법령 ID(id)가 필요합니다. 먼저 /api/tools/law-search로 검색하세요." },
        { status: 400 }
      );
    }

    const apiKey = process.env.LAW_API_KEY || "test";

    const params = new URLSearchParams({
      OC: apiKey,
      target: "law",
      type: "JSON",
      ID: lawId.trim(),
    });

    if (article) {
      params.set("JO", article.trim());
    }

    const response = await fetch(`${LAW_API_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`법제처 API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const lawInfo = data?.법령;

    if (!lawInfo) {
      return NextResponse.json(
        { error: "해당 법령을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const rawArticles = lawInfo?.조문?.조문단위;
    const articles: LawArticle[] = rawArticles
      ? (Array.isArray(rawArticles) ? rawArticles : [rawArticles]).map(
          (a: Record<string, string>): LawArticle => ({
            조문번호: a["조문번호"] || "",
            조문제목: a["조문제목"] || "",
            조문내용: (a["조문내용"] || "").replace(/<[^>]*>/g, "").trim(),
          })
        )
      : [];

    const result: LawTextResponse = {
      법령명: lawInfo["기본정보"]?.["법령명한글"] || lawInfo["법령명"] || "",
      법령ID: lawId,
      시행일자: lawInfo["기본정보"]?.["시행일자"] || "",
      소관부처: lawInfo["기본정보"]?.["소관부처명"] || "",
      조문목록: articles,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Law text error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `법령 본문 조회 중 오류가 발생했습니다.\n\n상세: ${errMsg}` },
      { status: 500 }
    );
  }
}
