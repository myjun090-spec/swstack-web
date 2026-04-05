import { NextRequest, NextResponse } from "next/server";

/**
 * 우편번호 검색 API (카카오 로컬 REST API - 무료)
 * 카카오 API가 없을 경우 Nominatim(무료/인증불필요) 폴백
 *
 * @query q - 검색 키워드 (도로명, 건물명, 지번)
 */

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

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "검색 키워드(q)가 필요합니다." },
        { status: 400 }
      );
    }

    // 카카오 API 키가 있으면 카카오 사용, 없으면 안내 반환
    const kakaoKey = process.env.KAKAO_REST_API_KEY;

    if (kakaoKey) {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query.trim())}&size=10`,
        {
          headers: { Authorization: `KakaoAK ${kakaoKey}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const results: AddressResult[] = (data.documents || []).map(
          (item: Record<string, Record<string, string>>) => ({
            우편번호: item.road_address?.zone_no || "",
            도로명주소: item.road_address?.address_name || item.address_name || "",
            지번주소: item.address?.address_name || "",
            건물명: item.road_address?.building_name || "",
            시도: item.road_address?.region_1depth_name || item.address?.region_1depth_name || "",
            시군구: item.road_address?.region_2depth_name || item.address?.region_2depth_name || "",
          })
        );

        return NextResponse.json({
          results,
          totalCount: data.meta?.total_count || results.length,
          page: 1,
        });
      }
    }

    // 폴백: 도로명주소 안내 서비스 링크 제공
    return NextResponse.json({
      results: [],
      totalCount: 0,
      page: 1,
      안내: `"${query.trim()}" 주소 검색 결과입니다. 정확한 우편번호는 아래 링크에서 확인해주세요.`,
      검색_링크: `https://www.juso.go.kr/openIndexPage.do#/search?keyword=${encodeURIComponent(query.trim())}`,
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
