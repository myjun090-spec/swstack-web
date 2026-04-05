import { NextRequest, NextResponse } from "next/server";

/**
 * 법령 검색 API (법망 API - 인증 불필요)
 * https://api.beopmang.org 를 활용하여 법령을 검색합니다.
 *
 * @query q - 검색 키워드 (예: "사회복지사업법", "노인복지")
 * @query page - 페이지 번호 (기본값: 1)
 */

const BEOPMANG_API = "https://api.beopmang.org/api/v4/law";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "검색 키워드(q)가 필요합니다." },
        { status: 400 }
      );
    }

    const url = `${BEOPMANG_API}?action=search&mode=keyword&q=${encodeURIComponent(query.trim())}`;

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
    const laws = data?.data?.results || [];
    const total = data?.data?.total || 0;

    const results = laws.map(
      (item: Record<string, string>) => ({
        법령명한글: item.law_name || "",
        법령약칭명: "",
        법령ID: item.law_id || "",
        공포일자: "",
        공포번호: "",
        시행일자: "",
        법령구분명: item.law_type || "",
        소관부처명: "",
      })
    );

    return NextResponse.json({ results, totalCount: total, page: 1 });
  } catch (error: unknown) {
    console.error("Law search error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `법령 검색 중 오류가 발생했습니다.\n\n상세: ${errMsg}` },
      { status: 500 }
    );
  }
}
