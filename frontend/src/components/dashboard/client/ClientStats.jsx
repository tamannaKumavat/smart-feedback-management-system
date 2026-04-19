import { FiCheckCircle, FiClipboard, FiClock, FiZap } from "react-icons/fi";
import StatCard from "./StatCard.jsx";

const ICONS = {
  clipboard: FiClipboard,
  clock: FiClock,
  checkCircle: FiCheckCircle,
  zap: FiZap,
};

const STAT_CARD_THEMES = [
  {
    gradientClassName:
      "bg-gradient-to-br from-indigo-50 via-violet-100/40 to-white",
    accentClassName: "text-indigo-600",
  },
  {
    gradientClassName:
      "bg-gradient-to-br from-amber-50 via-orange-100/35 to-white",
    accentClassName: "text-amber-700",
  },
  {
    gradientClassName:
      "bg-gradient-to-br from-emerald-50 via-teal-100/40 to-white",
    accentClassName: "text-emerald-700",
  },
  {
    gradientClassName: "bg-gradient-to-br from-sky-50 via-cyan-100/35 to-white",
    accentClassName: "text-sky-700",
  },
];

export default function ClientStats({ stats = [] }) {
  return (
    <div className="grid w-full min-w-0 shrink-0 grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
      {stats.map((item, index) => {
        const Icon = ICONS[item.iconKey] ?? FiClipboard;
        const percent =
          item.percentOfTotal != null && item.percentOfTotal !== ""
            ? `${item.percentOfTotal}% of total`
            : null;
        const trendLine =
          [item.trend, percent].filter(Boolean).join(" · ") || null;
        const theme = STAT_CARD_THEMES[index % STAT_CARD_THEMES.length];

        return (
          <StatCard
            key={item.id}
            title={item.title}
            value={item.value}
            trend={trendLine}
            icon={Icon}
            gradientClassName={theme.gradientClassName}
            accentClassName={theme.accentClassName}
          />
        );
      })}
    </div>
  );
}
