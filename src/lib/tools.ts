/**
 * AI 도구 정의 — 사회복지 AI 어시스턴트가 호출할 수 있는 확장 도구 목록
 * 각 도구는 대응하는 /api/tools/* 엔드포인트로 연결됩니다.
 */

export interface Tool {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST";
  params: ToolParam[];
}

export interface ToolParam {
  name: string;
  type: "string" | "file";
  required: boolean;
  description: string;
  example?: string;
}

export const TOOLS: Tool[] = [
  {
    id: "law-search",
    name: "법령 검색",
    description:
      "한국 법제처 Open API를 통해 법령을 키워드로 검색합니다.",
    endpoint: "/api/tools/law-search",
    method: "GET",
    params: [
      {
        name: "q",
        type: "string",
        required: true,
        description: "검색 키워드",
        example: "사회복지사업법",
      },
      {
        name: "page",
        type: "string",
        required: false,
        description: "페이지 번호 (기본값: 1)",
      },
    ],
  },
  {
    id: "law-text",
    name: "법령 본문 조회",
    description:
      "법령 ID로 법령의 조문(본문)을 조회합니다.",
    endpoint: "/api/tools/law-text",
    method: "GET",
    params: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "법령 일련번호 (법령 검색 결과에서 획득)",
      },
      {
        name: "article",
        type: "string",
        required: false,
        description: "특정 조문 번호 (예: 2 → 제2조)",
      },
    ],
  },
  {
    id: "parse-document",
    name: "문서 파싱",
    description:
      "HWP, PDF, DOCX 문서를 텍스트로 변환합니다.",
    endpoint: "/api/tools/parse-document",
    method: "POST",
    params: [
      {
        name: "file",
        type: "file",
        required: true,
        description: "변환할 문서 파일 (HWP, PDF, DOCX, 최대 10MB)",
      },
    ],
  },
  {
    id: "zipcode",
    name: "우편번호 검색",
    description:
      "도로명주소 기반 우편번호를 검색합니다.",
    endpoint: "/api/tools/zipcode",
    method: "GET",
    params: [
      {
        name: "q",
        type: "string",
        required: true,
        description: "검색 키워드 (도로명, 건물명, 지번)",
        example: "세종대로 209",
      },
      {
        name: "page",
        type: "string",
        required: false,
        description: "페이지 번호 (기본값: 1)",
      },
    ],
  },
  {
    id: "fine-dust",
    name: "미세먼지 조회",
    description:
      "실시간 대기질(미세먼지/초미세먼지) 정보를 조회합니다.",
    endpoint: "/api/tools/fine-dust",
    method: "GET",
    params: [
      {
        name: "station",
        type: "string",
        required: true,
        description: "측정소명 (예: 종로구, 강남구, 수원)",
        example: "종로구",
      },
    ],
  },
];
