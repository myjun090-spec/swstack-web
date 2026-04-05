/**
 * Server-side tool executor
 * Parses AI responses for tool call markers and executes them against /api/tools/* endpoints.
 */

import { TOOLS } from "./tools";

export interface ToolCallRequest {
  toolId: string;
  params: Record<string, string>;
}

export interface ToolCallResult {
  toolId: string;
  toolName: string;
  success: boolean;
  data: unknown;
  error?: string;
}

/**
 * Regex to match tool call blocks in AI responses.
 * Format:
 *   [TOOL_CALL: tool-id]
 *   param1=value1
 *   param2=value2
 *   [/TOOL_CALL]
 */
const TOOL_CALL_REGEX =
  /\[TOOL_CALL:\s*([\w-]+)\]\s*\n([\s\S]*?)\[\/TOOL_CALL\]/g;

/**
 * Parse tool call markers from an AI response string.
 */
export function parseToolCalls(text: string): ToolCallRequest[] {
  const calls: ToolCallRequest[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  TOOL_CALL_REGEX.lastIndex = 0;

  while ((match = TOOL_CALL_REGEX.exec(text)) !== null) {
    const toolId = match[1].trim();
    const paramBlock = match[2].trim();
    const params: Record<string, string> = {};

    for (const line of paramBlock.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        params[key] = val;
      }
    }

    calls.push({ toolId, params });
  }

  return calls;
}

/**
 * Check if an AI response contains any tool call markers.
 */
export function hasToolCalls(text: string): boolean {
  TOOL_CALL_REGEX.lastIndex = 0;
  return TOOL_CALL_REGEX.test(text);
}

/**
 * Execute a single tool call by making an internal HTTP request.
 * Uses the base URL to call the Next.js API routes directly.
 */
export async function executeTool(
  call: ToolCallRequest,
  baseUrl: string
): Promise<ToolCallResult> {
  const toolDef = TOOLS.find((t) => t.id === call.toolId);
  if (!toolDef) {
    return {
      toolId: call.toolId,
      toolName: call.toolId,
      success: false,
      data: null,
      error: `알 수 없는 도구: ${call.toolId}`,
    };
  }

  try {
    const url = new URL(toolDef.endpoint, baseUrl);

    if (toolDef.method === "GET") {
      for (const [key, value] of Object.entries(call.params)) {
        url.searchParams.set(key, value);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          toolId: call.toolId,
          toolName: toolDef.name,
          success: false,
          data: null,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return {
        toolId: call.toolId,
        toolName: toolDef.name,
        success: true,
        data,
      };
    }

    // POST tools (like parse-document) are not supported in chat flow
    // because they require file uploads
    return {
      toolId: call.toolId,
      toolName: toolDef.name,
      success: false,
      data: null,
      error:
        "이 도구는 대화 중 자동 호출이 지원되지 않습니다. 파일 업로드가 필요합니다.",
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      toolId: call.toolId,
      toolName: toolDef.name,
      success: false,
      data: null,
      error: errMsg,
    };
  }
}

/**
 * Execute all tool calls found in an AI response.
 */
export async function executeAllTools(
  calls: ToolCallRequest[],
  baseUrl: string
): Promise<ToolCallResult[]> {
  return Promise.all(calls.map((call) => executeTool(call, baseUrl)));
}

/**
 * Remove tool call markers from AI text to get the "clean" response.
 */
export function stripToolCalls(text: string): string {
  TOOL_CALL_REGEX.lastIndex = 0;
  return text.replace(TOOL_CALL_REGEX, "").trim();
}

/**
 * Format tool results into a text block that can be injected back into the conversation.
 */
export function formatToolResults(results: ToolCallResult[]): string {
  return results
    .map((r) => {
      if (r.success) {
        return `[도구 결과: ${r.toolName}]\n${JSON.stringify(r.data, null, 2)}`;
      }
      return `[도구 오류: ${r.toolName}]\n${r.error}`;
    })
    .join("\n\n");
}

/**
 * Generate the tool description block to inject into the system prompt.
 * Only includes GET-based tools (no file upload tools in chat context).
 */
export function getToolSystemPrompt(): string {
  const chatTools = TOOLS.filter((t) => t.method === "GET");

  if (chatTools.length === 0) return "";

  const toolDescriptions = chatTools
    .map((t) => {
      const paramDesc = t.params
        .map(
          (p) =>
            `  - ${p.name} (${p.required ? "필수" : "선택"}): ${p.description}${p.example ? ` (예: ${p.example})` : ""}`
        )
        .join("\n");

      return `### ${t.id}: ${t.name}\n${t.description}\n파라미터:\n${paramDesc}`;
    })
    .join("\n\n");

  return `
## 사용 가능한 도구 (Tools)

대화 중 사용자의 질문에 실제 데이터가 필요할 때, 아래 도구를 호출할 수 있습니다.
도구를 호출하려면 반드시 다음 형식을 사용하세요:

\`\`\`
[TOOL_CALL: 도구id]
파라미터명=값
[/TOOL_CALL]
\`\`\`

도구 호출 후 결과가 자동으로 제공됩니다. 결과를 바탕으로 사용자에게 친절하고 정확한 답변을 작성하세요.

**중요 규칙:**
- 사용자가 법령, 법률, 제도에 대해 물으면 → law-search를 사용하세요
- 법령 검색 결과에서 법령ID를 얻은 후 상세 조문이 필요하면 → law-text를 사용하세요
- 사용자가 우편번호나 주소를 물으면 → zipcode를 사용하세요
- 사용자가 미세먼지, 대기질, 외출 가능 여부를 물으면 → fine-dust를 사용하세요
- 도구 호출 시 반드시 응답 첫 부분에 배치하고, 도구 결과를 받은 후 답변을 작성하세요
- 한 번의 응답에서 여러 도구를 호출할 수 있습니다

${toolDescriptions}
`;
}
