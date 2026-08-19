import type { IconType } from "react-icons";
import * as FaIcons from "react-icons/fa6";
import * as SiIcons from "react-icons/si";
import * as TbIcons from "react-icons/tb";

type SkillDataProviderProps = {
  name: string;
  iconKey?: string;
  iconColor?: string;
};

const faIconLibrary =
  FaIcons as unknown as Record<string, IconType>;
const siIconLibrary =
  SiIcons as unknown as Record<string, IconType>;
const tbIconLibrary =
  TbIcons as unknown as Record<string, IconType>;

const fallbackIcon = FaIcons.FaCode;
const fallbackColor = "#c4b5fd";

const resolveColor = (iconColor?: string) =>
  iconColor && /^#[0-9A-Fa-f]{6}$/.test(iconColor)
    ? iconColor
    : fallbackColor;

export const SkillDataProvider = ({
  name,
  iconKey,
  iconColor,
}: SkillDataProviderProps) => {
 const Icon =
  (
    iconKey?.startsWith("Fa")
      ? faIconLibrary[iconKey]
      : iconKey?.startsWith("Si")
        ? siIconLibrary[iconKey]
        : iconKey?.startsWith("Tb")
          ? tbIconLibrary[iconKey]
          : undefined
  ) ?? fallbackIcon;

const color = resolveColor(iconColor);

  return (
    <div
      className="group flex min-h-[7rem] flex-col items-center justify-center gap-3 rounded-lg border border-[#7042f86b] bg-[#08021c]/70 p-4 text-center shadow-[inset_0_0_14px_rgba(191,151,255,0.12)] backdrop-blur-md transition hover:-translate-y-1 hover:border-cyan-300/50 hover:bg-[#0d0626]/80"
      aria-label={name}
      title={name}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/5 shadow-[0_0_24px_rgba(112,66,248,0.18)]">
        <Icon
          className="h-7 w-7 transition group-hover:scale-110"
          style={{ color }}
          aria-hidden="true"
        />
      </span>

      <span className="text-xs font-medium leading-5 text-gray-200 sm:text-sm">
        {name}
      </span>
    </div>
  );
};