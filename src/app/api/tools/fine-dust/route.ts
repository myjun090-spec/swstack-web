import { NextRequest, NextResponse } from "next/server";

/**
 * 미세먼지 조회 API (k-skill 연동)
 * 한국환경공단 에어코리아 API를 활용하여 대기질 정보를 조회합니다.
 *
 * @query station - 측정소명 (예: "종로구", "강남구", "수원")
 */

const AIR_API_URL =
  "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty";

interface AirQualityResult {
  측정소: string;
  측정시간: string;
  미세먼지_PM10: string;
  미세먼지_등급: string;
  초미세먼지_PM25: string;
  초미세먼지_등급: string;
  오존: string;
  통합대기지수: string;
  통합대기등급: string;
  권고사항: string;
}

function getGradeLabel(grade: string): string {
  switch (grade) {
    case "1":
      return "좋음";
    case "2":
      return "보통";
    case "3":
      return "나쁨";
    case "4":
      return "매우나쁨";
    default:
      return "정보없음";
  }
}

function getRecommendation(pm10Grade: string, pm25Grade: string): string {
  const worst = Math.max(
    parseInt(pm10Grade) || 0,
    parseInt(pm25Grade) || 0
  );

  switch (worst) {
    case 1:
      return "야외활동 적합합니다. 어르신/아동 외출 가능합니다.";
    case 2:
      return "보통 수준입니다. 일반인은 활동 가능하나, 호흡기 질환자는 주의가 필요합니다.";
    case 3:
      return "외출을 자제해주세요. 어르신, 아동, 호흡기/심혈관 질환자는 실내 활동을 권장합니다. 마스크(KF80 이상) 착용이 필요합니다.";
    case 4:
      return "외출을 삼가해주세요. 모든 대상자의 야외활동을 중단하고, 실내에서도 공기청정기 가동을 권장합니다. 응급 호흡기 증상 발생 시 119에 연락하세요.";
    default:
      return "현재 대기질 정보를 확인할 수 없습니다. 기상청(131) 또는 에어코리아를 확인해주세요.";
  }
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

    const apiKey = process.env.DATA_GO_KR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "공공데이터포털 API 키가 설정되지 않았습니다. DATA_GO_KR_API_KEY 환경변수를 확인해주세요.",
        },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      serviceKey: apiKey,
      returnType: "json",
      numOfRows: "1",
      pageNo: "1",
      stationName: station.trim(),
      dataTerm: "DAILY",
      ver: "1.3",
    });

    const response = await fetch(`${AIR_API_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`에어코리아 API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const items = data?.response?.body?.items;

    if (!items || items.length === 0) {
      return NextResponse.json(
        {
          error: `"${station}" 측정소의 데이터를 찾을 수 없습니다. 측정소명을 확인해주세요.`,
        },
        { status: 404 }
      );
    }

    const item = items[0];
    const pm10Grade = item.pm10Grade || "0";
    const pm25Grade = item.pm25Grade || "0";

    const result: AirQualityResult = {
      측정소: station.trim(),
      측정시간: item.dataTime || "",
      미세먼지_PM10: item.pm10Value ? `${item.pm10Value} ㎍/㎥` : "정보없음",
      미세먼지_등급: getGradeLabel(pm10Grade),
      초미세먼지_PM25: item.pm25Value ? `${item.pm25Value} ㎍/㎥` : "정보없음",
      초미세먼지_등급: getGradeLabel(pm25Grade),
      오존: item.o3Value ? `${item.o3Value} ppm` : "정보없음",
      통합대기지수: item.khaiValue || "정보없음",
      통합대기등급: getGradeLabel(item.khaiGrade || "0"),
      권고사항: getRecommendation(pm10Grade, pm25Grade),
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
