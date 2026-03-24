import Link from "next/link";
import { SKILL_CATEGORIES, SKILLS } from "@/data/skills";

export default function Home() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          swstack
        </h1>
        <p className="text-lg text-slate-600">
          사회복지 실천을 위한 AI 도우미 — 역할별 전문 스킬로 업무를 지원합니다
        </p>
      </div>

      {/* Skill Cards by Category */}
      {SKILL_CATEGORIES.map((cat) => {
        const catSkills = SKILLS.filter((s) => s.category === cat.id);
        return (
          <div key={cat.id} className="mb-8">
            <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${cat.color}`}
              />
              {cat.icon} {cat.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catSkills.map((skill) => (
                <Link
                  key={skill.id}
                  href={`/skills/${skill.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{skill.icon}</span>
                    <div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {skill.name}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {skill.role}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">{skill.description}</p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {/* Getting Started */}
      <div className="mt-10 p-6 bg-green-50 rounded-xl border border-green-100">
        <h3 className="font-semibold text-green-800 mb-2">처음 사용하시나요?</h3>
        <ol className="text-sm text-green-700 space-y-2 list-decimal list-inside">
          <li>
            왼쪽 하단 <strong>API 설정</strong> 버튼을 클릭합니다
          </li>
          <li>
            AI 모델을 선택합니다 (Google Gemini 추천 — <strong>무료</strong>)
          </li>
          <li>
            API 키를 입력합니다
            <span className="block text-xs text-green-600 ml-5 mt-0.5">
              Gemini 키 발급: aistudio.google.com/apikey (구글 계정으로 바로 발급)
            </span>
          </li>
          <li>원하는 스킬을 선택하고 대화를 시작합니다</li>
          <li>완성된 문서를 복사하여 한글/워드에 붙여넣기합니다</li>
        </ol>
      </div>

      {/* Supported Models */}
      <div className="mt-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
        <h3 className="font-semibold text-slate-700 mb-2">지원 AI 모델</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-white rounded-lg border border-green-200">
            <div className="font-medium text-slate-800">Google Gemini</div>
            <div className="text-green-600 text-xs font-medium">무료 — 일 1,500회</div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="font-medium text-slate-800">ChatGPT</div>
            <div className="text-slate-500 text-xs">저렴 — gpt-4o-mini</div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="font-medium text-slate-800">Claude</div>
            <div className="text-slate-500 text-xs">유료 — 최고 품질</div>
          </div>
        </div>
      </div>
    </div>
  );
}
