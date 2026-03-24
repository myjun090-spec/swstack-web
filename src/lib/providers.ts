export interface Provider {
  id: string;
  name: string;
  model: string;
  placeholder: string;
  helpUrl: string;
  free: boolean;
  description: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    model: "gemini-2.0-flash",
    placeholder: "AIza...",
    helpUrl: "https://aistudio.google.com/apikey",
    free: true,
    description: "무료 — 일 1,500회 사용 가능 (추천)",
  },
  {
    id: "openai",
    name: "ChatGPT (OpenAI)",
    model: "gpt-4o-mini",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    free: false,
    description: "저렴 — gpt-4o-mini 사용",
  },
  {
    id: "anthropic",
    name: "Claude (Anthropic)",
    model: "claude-sonnet-4-6",
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
    free: false,
    description: "유료 — 최고 품질",
  },
];
