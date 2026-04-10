import React from "react";
import { 
  HeadphonesIcon, 
  BookTextIcon, 
  PenIcon, 
  MicIcon, 
  ClipboardPenIcon, 
  SpellCheckIcon,
  HelpCircleIcon
} from "lucide-react";

export type SkillType = "listening" | "reading" | "writing" | "speaking" | "grammar" | "vocab" | "vocabulary";

interface SkillIconProps {
  skill: SkillType | string;
  className?: string;
  size?: number;
}

export const SkillIcon: React.FC<SkillIconProps> = ({ skill, className, size = 18 }) => {
  const normalizedSkill = skill.toLowerCase();

  switch (normalizedSkill) {
    case "listening":
      return <HeadphonesIcon className={className} size={size} />;
    case "reading":
      return <BookTextIcon className={className} size={size} />;
    case "writing":
      return <PenIcon className={className} size={size} />;
    case "speaking":
      return <MicIcon className={className} size={size} />;
    case "grammar":
      return <ClipboardPenIcon className={className} size={size} />;
    case "vocab":
    case "vocabulary":
      return <SpellCheckIcon className={className} size={size} />;
    default:
      return <HelpCircleIcon className={className} size={size} />;
  }
};
