"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SKILL_CATEGORIES, SKILLS } from "@/data/skills";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } bg-slate-800 text-white flex flex-col transition-all duration-200 shrink-0`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {!collapsed && (
          <Link href="/" className="text-lg font-bold tracking-tight">
            swstack
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-slate-700 rounded text-slate-400"
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {SKILL_CATEGORIES.map((cat) => (
          <div key={cat.id} className="mb-1">
            {!collapsed && (
              <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {cat.icon} {cat.name}
              </div>
            )}
            {SKILLS.filter((s) => s.category === cat.id).map((skill) => {
              const href = `/skills/${skill.id}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={skill.id}
                  href={href}
                  title={skill.name}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span className="text-base shrink-0">{skill.icon}</span>
                  {!collapsed && <span>{skill.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
          사회복지 실천 AI 도우미
        </div>
      )}
    </aside>
  );
}
