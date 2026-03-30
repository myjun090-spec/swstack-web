import { NextRequest, NextResponse } from "next/server";

/**
 * 우편번호 검색 API (k-skill 연동)
 * 도로명주소 기반 우편번호를 검색합니다.
 *
 * @query q - 검색 키워드 (도로명, 건물명, 지번 등)
 * @query page - 페이지 번호 (기본값: 1)
 */

const JUSO_API_URL = "https://business.juso.go.kr/addrlink/addrLinkApi.do";

interface AddressResult {
  우편번호: string;
  도로명주소: string;
  지번주소: string;
  건물명: string;
  시도: string;
  시군구: string;
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

    const apiKey = process.env.JUSO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "주소 검색 API 키가 설정되지 않았습니다. JUSO_API_KEY 환경변수를 확인해주세요.",
        },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      confmKey: apiKey,
      currentPage: page,
      countPerPage: "10",
      keyword: query.trim(),
      resultType: "json",
    });

    const response = await fetch(`${JUSO_API_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`주소 API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const common = data?.results?.common;

    if (common?.errorCode !== "0") {
      return NextResponse.json(
        { error: `주소 검색 오류: ${common?.errorMessage || "알 수 없는 오류"}` },
        { status: 500 }
      );
    }

    const jusoList = data?.results?.juso || [];
    const results: AddressResult[] = jusoList.map(
      (item: Record<string, string>): AddressResult => ({
        우편번호: item.zipNo || "",
        도로명주소: item.roadAddr || "",
        지번주소: item.jibunAddr || "",
        건물명: item.bdNm || "",
        시도: item.siNm || "",
        시군구: item.sggNm || "",
      })
    );

    const totalCount = parseInt(common?.totalCount || "0", 10);

    return NextResponse.json({
      results,
      totalCount,
      page: parseInt(page, 10),
    });
  } catch (error: unknown) {
    console.error("Zipcode search error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `우편번호 검색 중 오류가 발생했습니다.\n\n상세: ${errMsg}` },
      { status: 500 }
    );
  }
}
