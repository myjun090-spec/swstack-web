import { NextRequest, NextResponse } from "next/server";

/**
 * 법령 검색 API (korean-law-mcp 연동)
 * 한국 법제처 Open API를 활용하여 법령을 검색합니다.
 *
 * @query q - 검색 키워드 (예: "사회복지사업법", "노인복지")
 * @query page - 페이지 번호 (기본값: 1)
 */

const LAW_API_BASE = "https://www.law.go.kr/DRF/lawSearch.do";

interface LawSearchResult {
  법령명한글: string;
  법령약칭명: string;
  법령ID: string;
  공포일자: string;
  공포번호: string;
  시행일자: string;
  법령구분명: string;
  소관부처명: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const page = searchParams.get("page") || "1";

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "검색 키워드(q)가 필요합니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.LAW_API_KEY || "test";

    const params = new URLSearchParams({
      OC: apiKey,
      target: "law",
      type: "JSON",
      query: query.trim(),
      page,
      display: "10",
    });

    const response = await fetch(`${LAW_API_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`법제처 API 응답 오류: ${response.status}`);
    }

    const data = await response.json();

    const laws = data?.LawSearch?.law;
    if (!laws) {
      return NextResponse.json({ results: [], totalCount: 0 });
    }

    const results: LawSearchResult[] = (
      Array.isArray(laws) ? laws : [laws]
    ).map(
      (item: Record<string, string>): LawSearchResult => ({
        법령명한글: item["법령명한글"] || item["법령명"] || "",
        법령약칭명: item["법령약칭명"] || "",
        법령ID: item["법령일련번호"] || item["법령ID"] || "",
        공포일자: item["공포일자"] || "",
        공포번호: item["공포번호"] || "",
        시행일자: item["시행일자"] || "",
        법령구분명: item["법령구분명"] || "",
        소관부처명: item["소관부처명"] || "",
      })
    );

    const totalCount = parseInt(data?.LawSearch?.totalCnt || "0", 10);

    return NextResponse.json({ results, totalCount, page: parseInt(page, 10) });
  } catch (error: unknown) {
    console.error("Law search error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `법령 검색 중 오류가 발생했습니다.\n\n상세: ${errMsg}` },
      { status: 500 }
    );
  }
}
