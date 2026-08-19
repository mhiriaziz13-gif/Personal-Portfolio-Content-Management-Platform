import type { SkillItem } from "@/constants/portfolio";

export type SkillValue = string | SkillItem;

export const normalizeSkill = (skill: SkillValue): SkillItem =>
  typeof skill === "string"
    ? { name: skill }
    : skill;

export const getSkillName = (skill: SkillValue) =>
  normalizeSkill(skill).name;
