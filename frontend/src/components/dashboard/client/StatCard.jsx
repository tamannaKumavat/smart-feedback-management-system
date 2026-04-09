export default function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  gradientClassName = "bg-gradient-to-br from-[#EEF4FF] via-[#F8FAFF] to-white",
  accentClassName = "text-[#2563EB]",
}) {
  return (
    <article
      className={`flex min-h-0 min-w-0 w-full flex-col rounded-xl border border-[#F3F4F6] p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4 ${gradientClassName}`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-white/60 backdrop-blur-[2px] sm:h-10 sm:w-10">
          {Icon ? (
            <Icon
              className={`text-[18px] sm:text-[20px] ${accentClassName}`}
              strokeWidth={2}
              aria-hidden
            />
          ) : null}
        </div>
        <span className="min-w-0 text-[12px] font-medium leading-snug text-[#64748B] sm:text-[13px]">
          {title}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2 sm:mt-4">
        <p className="text-xl font-bold leading-none tracking-tight text-[#111827] sm:text-2xl">
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
    </article>
  );
}
