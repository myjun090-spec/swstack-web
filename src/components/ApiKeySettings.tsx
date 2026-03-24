"use client";

import { useState, useEffect } from "react";
import { PROVIDERS, type Provider } from "@/lib/providers";

interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeySettings({ isOpen, onClose }: ApiKeySettingsProps) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [activeProvider, setActiveProvider] = useState("gemini");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedKeys: Record<string, string> = {};
    PROVIDERS.forEach((p) => {
      const key = localStorage.getItem(`swstack_apikey_${p.id}`);
      if (key) storedKeys[p.id] = key;
    });
    setKeys(storedKeys);
    const storedProvider = localStorage.getItem("swstack_provider");
    if (storedProvider) setActiveProvider(storedProvider);
  }, []);

  const saveSettings = () => {
    PROVIDERS.forEach((p) => {
      if (keys[p.id]) {
        localStorage.setItem(`swstack_apikey_${p.id}`, keys[p.id]);
      } else {
        localStorage.removeItem(`swstack_apikey_${p.id}`);
      }
    });
    localStorage.setItem("swstack_provider", activeProvider);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-xl animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">API 설정</h2>
          <p className="text-sm text-slate-500 mt-1">
            AI 모델을 선택하고 API 키를 입력하세요. 키는 브라우저에만 저장됩니다.
          </p>
        </div>

        {/* Provider Selection */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              사용할 AI 모델
            </label>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    activeProvider === p.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p.id}
                    checked={activeProvider === p.id}
                    onChange={() => setActiveProvider(p.id)}
                    className="accent-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-800">
                        {p.name}
                      </span>
                      {p.free && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                          FREE
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{p.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          {PROVIDERS.map((p) => {
            if (p.id !== activeProvider) return null;
            return (
              <div key={p.id}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {p.name} API 키
                </label>
                <input
                  type="password"
                  value={keys[p.id] || ""}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  placeholder={p.placeholder}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <a
                  href={p.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                >
                  API 키 발급받기 →
                </a>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={saveSettings}
            disabled={!keys[activeProvider]}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saved ? "저장됨!" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function getStoredProvider(): string {
  if (typeof window === "undefined") return "gemini";
  return localStorage.getItem("swstack_provider") || "gemini";
}

export function getStoredApiKey(providerId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`swstack_apikey_${providerId}`);
}
