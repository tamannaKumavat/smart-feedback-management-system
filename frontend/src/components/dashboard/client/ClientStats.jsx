import { FiCheckCircle, FiClipboard, FiClock, FiZap } from "react-icons/fi";
import StatCard from "./StatCard.jsx";

const ICONS = {
  clipboard: FiClipboard,
  clock: FiClock,
  checkCircle: FiCheckCircle,
  zap: FiZap,
};

export default function ClientStats({ stats = [] }) {
  return (
    <div className="grid w-full shrink-0 grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => {
        const Icon = ICONS[item.iconKey] ?? FiClipboard;
        const percent =
          item.percentOfTotal != null && item.percentOfTotal !== ""
            ? `${item.percentOfTotal}% of total`
            : null;
        const trendLine = [item.trend, percent].filter(Boolean).join(" · ") || null;

        return (
          <StatCard
            key={item.id}
            title={item.title}
            value={item.value}
            trend={trendLine}
            icon={Icon}
          />
        );
      })}
    </div>
  );
}
