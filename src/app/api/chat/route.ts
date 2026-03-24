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
    model: "gemini-2.5-flash",
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
    const { messages, systemPrompt, provider, apiKey } = await req.json();

    if (!messages || !systemPrompt) {
      return NextResponse.json(
        { error: "messages와 systemPrompt가 필요합니다" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "API 키가 필요합니다. 왼쪽 하단 API 설정에서 키를 입력해주세요.",
        },
        { status: 401 }
      );
    }

    let content: string;

    switch (provider) {
      case "gemini":
        content = await callGemini(apiKey, systemPrompt, messages);
        break;
      case "openai":
        content = await callOpenAI(apiKey, systemPrompt, messages);
        break;
      case "anthropic":
        content = await callAnthropic(apiKey, systemPrompt, messages);
        break;
      default:
        content = await callGemini(apiKey, systemPrompt, messages);
    }

    return NextResponse.json({ content });
  } catch (error: unknown) {
    console.error("Chat API error:", error);

    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";

    if (
      message.includes("API_KEY") ||
      message.includes("api_key") ||
      message.includes("401") ||
      message.includes("authentication") ||
      message.includes("Unauthorized")
    ) {
      return NextResponse.json(
        {
          error:
            "API 키가 유효하지 않습니다. API 설정에서 키를 확인해주세요.",
        },
        { status: 401 }
      );
    }

    if (
      message.includes("429") ||
      message.includes("quota") ||
      message.includes("rate")
    ) {
      return NextResponse.json(
        {
          error:
            "API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `AI 응답 생성 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
