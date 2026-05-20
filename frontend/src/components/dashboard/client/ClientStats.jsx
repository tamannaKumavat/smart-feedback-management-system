import { motion } from "framer-motion";
import { FiCheckCircle, FiClipboard, FiClock, FiFileText } from "react-icons/fi";
import { STAT_TITLE_KEY_BY_ID } from "@/i18n/clientDashboard.js";
import { useTranslation } from "@/i18n/useTranslation.js";
import { staggerContainer, staggerItem } from "../../../lib/motion.js";
import StatCard from "./StatCard.jsx";

const ICONS = {
  clipboard: FiClipboard,
  clock: FiClock,
  checkCircle: FiCheckCircle,
  fileText: FiFileText,
};

const STAT_CARD_THEMES = [
  {
    themeKey: "indigo",
    accentClassName: "text-indigo-600",
  },
  {
    themeKey: "amber",
    accentClassName: "text-amber-600",
  },
  {
    themeKey: "emerald",
    accentClassName: "text-emerald-600",
  },
  {
    themeKey: "sky",
    accentClassName: "text-sky-600",
  },
];

export default function ClientStats({ stats = [] }) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="grid w-full min-w-0 shrink-0 grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {stats.map((item, index) => {
        const Icon = ICONS[item.iconKey] ?? FiClipboard;
        const titleKey = STAT_TITLE_KEY_BY_ID[item.id];
        const title = titleKey ? t(titleKey) : item.title;
        const percent =
          item.percentOfTotal != null && item.percentOfTotal !== ""
            ? t("stats.percentOfTotal", { percent: item.percentOfTotal })
            : null;
        const trendLine =
          [item.trend, percent].filter(Boolean).join(" · ") || null;
        const theme = STAT_CARD_THEMES[index % STAT_CARD_THEMES.length];

        return (
          <motion.div key={item.id} variants={staggerItem}>
            <StatCard
              title={title}
              value={item.value}
              trend={trendLine}
              icon={Icon}
              themeKey={theme.themeKey}
              accentClassName={theme.accentClassName}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
