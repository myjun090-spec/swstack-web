import { NextRequest, NextResponse } from "next/server";

/**
 * 법령 본문 조회 API (법망 API - 인증 불필요)
 * 법령 ID로 법령의 전체 본문(조문)을 조회합니다.
 *
 * @query id - 법령 ID (법령 검색 결과에서 획득)
 */

const BEOPMANG_API = "https://api.beopmang.org/api/v4/law";

interface LawArticle {
  조문번호: string;
  조문제목: string;
  조문내용: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lawId = searchParams.get("id");

    if (!lawId || lawId.trim().length === 0) {
      return NextResponse.json(
        { error: "법령 ID(id)가 필요합니다. 먼저 /api/tools/law-search로 검색하세요." },
        { status: 400 }
      );
    }

    const url = `${BEOPMANG_API}?action=get&law_id=${encodeURIComponent(lawId.trim())}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 swstack-web",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`법망 API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const lawData = data?.data;

    if (!lawData) {
      return NextResponse.json(
        { error: "해당 법령을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const rawArticles = lawData.articles || [];
    const articles: LawArticle[] = rawArticles.map(
      (a: Record<string, string>): LawArticle => ({
        조문번호: a.number || a.label || "",
        조문제목: a.title || "",
        조문내용: (a.content || "").replace(/<[^>]*>/g, "").trim(),
      })
    );

    return NextResponse.json({
      법령명: lawData.law_name || "",
      법령ID: lawId,
      시행일자: lawData.enforcement_date || "",
      소관부처: lawData.ministry || "",
      조문목록: articles,
    });
  } catch (error: unknown) {
    console.error("Law text error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `법령 본문 조회 중 오류가 발생했습니다.\n\n상세: ${errMsg}` },
      { status: 500 }
    );
  }
}
