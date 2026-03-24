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

      {/* Info */}
      <div className="mt-10 p-6 bg-blue-50 rounded-xl border border-blue-100">
        <h3 className="font-semibold text-blue-800 mb-2">사용 방법</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>왼쪽 메뉴 또는 위 카드에서 원하는 스킬을 선택합니다</li>
          <li>AI가 해당 역할로 전환되어 대화형으로 안내합니다</li>
          <li>질문에 답하면 구조화된 문서가 자동 생성됩니다</li>
          <li>완성된 문서를 복사하여 활용합니다</li>
        </ol>
        <p className="text-xs text-blue-500 mt-3">
          * ANTHROPIC_API_KEY 환경변수 설정이 필요합니다 (.env.local 파일)
        </p>
      </div>
    </div>
  );
}
