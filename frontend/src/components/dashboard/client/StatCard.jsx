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
      className={`client-stat-card client-stat-card--${themeKey} flex min-h-0 min-w-0 w-full flex-col rounded-xl border p-2.5 sm:p-4`}
    >
      <div className="flex items-start gap-2 sm:items-center sm:gap-3">
        <div className="client-stat-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-card ring-1 ring-border-subtle backdrop-blur-[2px] sm:h-10 sm:w-10 sm:rounded-xl">
          {Icon ? (
            <Icon
              className={`text-[16px] sm:text-[20px] ${accentClassName}`}
              strokeWidth={2}
              aria-hidden
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1 sm:flex sm:items-center">
          <span className="block truncate text-[11px] font-medium leading-snug text-content-muted sm:min-w-0 sm:flex-1 sm:text-[13px]">
            {title}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2 pl-10 sm:mt-3 sm:pl-0">
        <p className="text-lg font-bold leading-none tracking-tight text-dashboard-heading sm:text-2xl">
          {value}
        </p>
        {trend ? (
          <span
            className={`max-w-[55%] shrink-0 truncate text-right text-[10px] font-semibold leading-snug sm:text-[13px] ${accentClassName}`}
          >
            {trend}
          </span>
        ) : null}
      </div>
    </motion.article>
  );
}
