import { motion } from "framer-motion";

export default function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  themeKey = "indigo",
  accentClassName = "text-[var(--client-accent)]",
}) {
  return (
    <motion.article
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`client-stat-card client-stat-card--${themeKey} flex min-h-0 min-w-0 w-full flex-col rounded-xl border p-3 sm:p-4`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="client-stat-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-card ring-1 ring-border-subtle backdrop-blur-[2px] sm:h-10 sm:w-10">
          {Icon ? (
            <Icon
              className={`text-[18px] sm:text-[20px] ${accentClassName}`}
              strokeWidth={2}
              aria-hidden
            />
          ) : null}
        </div>
        <span className="min-w-0 text-[12px] font-medium leading-snug text-content-muted sm:text-[13px]">
          {title}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2 sm:mt-4">
        <p className="text-xl font-bold leading-none tracking-tight text-dashboard-heading sm:text-2xl">
          {value}
        </p>
        {trend ? (
          <span
            className={`max-w-[55%] shrink-0 text-right text-[11px] font-semibold leading-snug sm:text-[13px] ${accentClassName}`}
          >
            {trend}
          </span>
        ) : null}
      </div>
    </motion.article>
  );
}
