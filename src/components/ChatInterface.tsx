"use client";

import { useState, useRef, useEffect } from "react";
import type { Skill } from "@/data/skills";
import { getStoredProvider, getStoredApiKey } from "@/components/ApiKeySettings";
import { PROVIDERS } from "@/lib/providers";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatInterface({ skill }: { skill: Skill }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: skill.initialMessage },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [providerName, setProviderName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 클라이언트에서만 provider 읽기 (hydration 문제 방지)
  useEffect(() => {
    const pid = getStoredProvider();
    const p = PROVIDERS.find((pr) => pr.id === pid);
    if (p) setProviderName(p.name);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const providerId = getStoredProvider();
    const apiKey = getStoredApiKey(providerId);

    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: input.trim() },
        {
          role: "assistant",
          content:
            "API 키가 설정되지 않았습니다.\n\n왼쪽 하단의 [API 설정] 버튼을 클릭하여 API 키를 입력해주세요.\n\nGoogle Gemini API는 무료로 사용 가능합니다.",
        },
      ]);
      setInput("");
      return;
    }

    const userMessage = input.trim();
    setInput("");

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // API에 보낼 메시지: 초기 assistant 인사말을 제거하고 user부터 시작
      // Gemini/Claude/OpenAI 모두 첫 메시지가 user여야 함
      const apiMessages = newMessages.filter((_, i) => i > 0); // 첫 번째(assistant 인사말) 제거

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt: skill.systemPrompt,
          provider: providerId,
          apiKey: apiKey,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `API 요청 실패 (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "오류가 발생했습니다";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `오류: ${errorMessage}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetChat = () => {
    setMessages([{ role: "assistant", content: skill.initialMessage }]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{skill.icon}</span>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              {skill.name}
            </h1>
            <p className="text-xs text-slate-400">{skill.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {providerName && (
            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
              {providerName}
            </span>
          )}
          <button
            onClick={resetChat}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            새 대화
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            } animate-fade-in`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
              </div>
              {msg.role === "assistant" && (
                <button
                  onClick={() => copyToClipboard(msg.content)}
                  className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  복사
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
