import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });
  const lastMessage = messages[messages.length - 1].content;
  const result = await chat.sendMessage(lastMessage);
  return result.response.text();
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });
  return response.choices[0]?.message?.content || "";
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, systemPrompt, provider, apiKey } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "메시지가 필요합니다." },
        { status: 400 }
      );
    }

    if (!systemPrompt) {
      return NextResponse.json(
        { error: "시스템 프롬프트가 필요합니다." },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            "유효한 API 키가 필요합니다. 왼쪽 하단 [API 설정]에서 키를 입력해주세요.",
        },
        { status: 401 }
      );
    }

    // 안전 장치: 메시지가 assistant로 시작하면 제거 (API 호환성)
    let cleanMessages = [...messages];
    while (cleanMessages.length > 0 && cleanMessages[0].role === "assistant") {
      cleanMessages.shift();
    }
    if (cleanMessages.length === 0) {
      return NextResponse.json(
        { error: "유효한 사용자 메시지가 없습니다." },
        { status: 400 }
      );
    }

    let content: string;

    switch (provider) {
      case "gemini":
        content = await callGemini(apiKey.trim(), systemPrompt, cleanMessages);
        break;
      case "openai":
        content = await callOpenAI(apiKey.trim(), systemPrompt, cleanMessages);
        break;
      case "anthropic":
        content = await callAnthropic(apiKey.trim(), systemPrompt, cleanMessages);
        break;
      default:
        content = await callGemini(apiKey.trim(), systemPrompt, cleanMessages);
    }

    return NextResponse.json({ content });
  } catch (error: unknown) {
    console.error("Chat API error:", error);

    const errMsg = error instanceof Error ? error.message : String(error);
    const errStr = errMsg.toLowerCase();

    // API 키 오류
    if (
      errStr.includes("api_key") ||
      errStr.includes("apikey") ||
      errStr.includes("api key") ||
      errStr.includes("401") ||
      errStr.includes("authentication") ||
      errStr.includes("unauthorized") ||
      errStr.includes("permission") ||
      errStr.includes("invalid")
    ) {
      return NextResponse.json(
        {
          error: `API 키가 유효하지 않습니다. [API 설정]에서 키를 확인해주세요.\n\n상세: ${errMsg}`,
        },
        { status: 401 }
      );
    }

    // 사용량 초과
    if (
      errStr.includes("429") ||
      errStr.includes("quota") ||
      errStr.includes("rate") ||
      errStr.includes("limit") ||
      errStr.includes("exceeded")
    ) {
      return NextResponse.json(
        {
          error:
            "API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
        },
        { status: 429 }
      );
    }

    // 모델 오류
    if (
      errStr.includes("model") ||
      errStr.includes("not found") ||
      errStr.includes("404")
    ) {
      return NextResponse.json(
        {
          error: `AI 모델을 찾을 수 없습니다. 다른 모델로 시도해주세요.\n\n상세: ${errMsg}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `AI 응답 생성 중 오류가 발생했습니다.\n\n상세: ${errMsg}` },
      { status: 500 }
    );
  }
}
