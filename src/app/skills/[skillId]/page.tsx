import { notFound } from "next/navigation";
import { SKILLS } from "@/data/skills";
import ChatInterface from "@/components/ChatInterface";

interface PageProps {
  params: Promise<{ skillId: string }>;
}

export default async function SkillPage({ params }: PageProps) {
  const { skillId } = await params;
  const skill = SKILLS.find((s) => s.id === skillId);

  if (!skill) {
    notFound();
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatInterface skill={skill} />
    </div>
  );
}

export async function generateStaticParams() {
  return SKILLS.map((skill) => ({
    skillId: skill.id,
  }));
}
