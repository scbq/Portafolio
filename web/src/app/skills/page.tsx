import type { Metadata } from "next";
import { SkillRange } from "@/components/skill-range";

export const metadata: Metadata = {
  title: "Skills · Campo de tiro",
  description: "Dispara a cada botella para descubrir mis skills y los proyectos donde las usé.",
};

export default function SkillsPage() {
  return <SkillRange />;
}
