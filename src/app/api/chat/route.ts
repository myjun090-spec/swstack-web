import { NextRequest, NextResponse } from "next/server";
import {
  parseToolCalls,
  hasToolCalls,
  executeAllTools,
  stripToolCalls,
  formatToolResults,
  getToolSystemPrompt,
} from "@/lib/tool-executor";

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

/**
 * Call the selected LLM provider.
 */
async function callLLM(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  switch (provider) {
    case "gemini":
      return callGemini(apiKey, systemPrompt, messages);
    case "openai":
      return callOpenAI(apiKey, systemPrompt, messages);
    case "anthropic":
      return callAnthropic(apiKey, systemPrompt, messages);
    default:
      return callGemini(apiKey, systemPrompt, messages);
  }
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

    // Remove initial assistant greeting from messages (API compatibility)
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

    // Inject tool descriptions into the system prompt
    const toolPrompt = getToolSystemPrompt();
    const enhancedSystemPrompt = systemPrompt + "\n" + toolPrompt;

    // Determine the base URL for internal tool API calls
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const baseUrl = `${proto}://${host}`;

    // First LLM call
    let content = await callLLM(
      provider,
      apiKey.trim(),
      enhancedSystemPrompt,
      cleanMessages
    );

    // Tool-calling loop: if the AI response contains tool calls,
    // execute them and feed results back for a second LLM call.
    // Max 1 round of tool calls to avoid infinite loops.
    if (hasToolCalls(content)) {
      const toolCalls = parseToolCalls(content);
      const toolResults = await executeAllTools(toolCalls, baseUrl);
      const resultText = formatToolResults(toolResults);
      const cleanResponse = stripToolCalls(content);

      // Build a follow-up conversation: inject tool results as a user message
      // so the AI can incorporate real data into its answer.
      const followUpMessages: ChatMessage[] = [
        ...cleanMessages,
        {
          role: "assistant",
          content: cleanResponse || "도구를 호출하여 정보를 조회합니다...",
        },
        {
          role: "user",
          content: `[시스템: 도구 호출 결과]\n\n${resultText}\n\n위 도구 결과를 바탕으로 사용자의 질문에 정확하고 친절하게 답변해주세요. 도구 호출 형식([TOOL_CALL])은 더 이상 사용하지 마세요.`,
        },
      ];

      content = await callLLM(
        provider,
        apiKey.trim(),
        enhancedSystemPrompt,
        followUpMessages
      );

      // Return with metadata about which tools were called
      const toolsMeta = toolResults.map((r) => ({
        toolId: r.toolId,
        toolName: r.toolName,
        success: r.success,
        error: r.error,
      }));

      return NextResponse.json({ content, toolsCalled: toolsMeta });
    }

    return NextResponse.json({ content });
  } catch (error: unknown) {
    console.error("Chat API error:", error);

    const errMsg = error instanceof Error ? error.message : String(error);
    const errStr = errMsg.toLowerCase();

    // API key errors
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

    // Rate limiting
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

    // Model errors
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
