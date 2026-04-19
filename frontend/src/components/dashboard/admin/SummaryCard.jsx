const shell =
  "rounded-xl border border-[#F3F4F6] bg-gradient-to-br from-[#EEF4FF] via-[#F8FAFF] to-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4";

export default function SummaryCard({ card }) {
  const isPositive = card.change.trim().startsWith("+");
  return (
    <div
      className={`${shell} flex h-full min-h-[118px] flex-col sm:min-h-[124px]`}
    >
      <div className="flex items-center justify-between text-[12px] font-medium text-[#64748B] sm:text-[13px]">
        <span className="tabular-nums">
          {card.change}{" "}
          <span className={isPositive ? "text-[#22C55E]" : "text-[#F97316]"}>
            {isPositive ? "↗" : "↘"}
          </span>
        </span>
        <span className="text-[11px] text-[#94A3B8] sm:text-[12px]">
          This week <span className="ml-0.5">⌄</span>
        </span>
      </div>
      <div className="mt-3 flex flex-1 items-end justify-between gap-2 sm:mt-4">
        <div className="min-w-0">
          <p className="text-[22px] font-bold leading-none tracking-tight text-[#111827] sm:text-[26px]">
            {card.value}
          </p>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-[#64748B] sm:text-[14px]">
            {card.title}
          </p>
        </div>
      </div>
    </div>
  );
}
