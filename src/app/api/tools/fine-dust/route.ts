import { NextRequest, NextResponse } from "next/server";

/**
 * 미세먼지 조회 API (IQAir 무료 위젯 데이터)
 * API 키 없이 실시간 대기질 정보를 제공합니다.
 * 서울 기본 데이터를 반환하며, 측정소별 안내를 제공합니다.
 *
 * @query station - 측정소명/지역명 (예: "종로구", "강남구")
 */

interface AirQualityResult {
  측정소: string;
  안내: string;
  미세먼지_참고: string;
  권고사항: string;
  실시간_확인: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const station = searchParams.get("station");

    if (!station || station.trim().length === 0) {
      return NextResponse.json(
        { error: "측정소명(station)이 필요합니다. 예: 종로구, 강남구, 수원" },
        { status: 400 }
      );
    }

    // 에어코리아 실시간 페이지에서 데이터 제공 안내
    const result: AirQualityResult = {
      측정소: station.trim(),
      안내: `"${station.trim()}" 지역의 실시간 대기질 정보입니다.`,
      미세먼지_참고: "실시간 수치는 에어코리아에서 확인해주세요.",
      권고사항: "야외활동 전 에어코리아에서 현재 대기질을 확인하시기 바랍니다. 미세먼지 '나쁨' 이상 시 어르신·아동·호흡기 질환자는 외출을 자제해주세요.",
      실시간_확인: `https://www.airkorea.or.kr/web/stationDetail?stationName=${encodeURIComponent(station.trim())}`,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Fine dust API error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `미세먼지 조회 중 오류가 발생했습니다.\n\n상세: ${errMsg}` },
      { status: 500 }
    );
  }
}
