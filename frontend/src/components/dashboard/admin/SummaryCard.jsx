const shell =
  "rounded-xl border border-[#F3F4F6] bg-gradient-to-br from-[#EEF4FF] via-[#F8FAFF] to-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4";

export default function SummaryCard({ card }) {
  const change = typeof card.change === "string" ? card.change.trim() : "";
  const hasChange = change.length > 0;
  const isNegativeNumber = change.startsWith("-");
  const isImprovement =
    typeof card.isImprovement === "boolean"
      ? card.isImprovement
      : !isNegativeNumber;
  const arrow = isNegativeNumber ? "↘" : "↗";
  const arrowColor = isImprovement ? "#22C55E" : "#F97316";

  return (
    <div
      className={`${shell} flex h-full min-h-[118px] flex-col justify-between text-[#0F172A] sm:min-h-[124px]`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold leading-snug text-[#1E293B]/90 sm:text-[13px]">
          {card.title}
        </p>
        {hasChange ? (
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-[#475569] sm:text-[12px]">
            {change}{" "}
            <span style={{ color: arrowColor }}>{arrow}</span>
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#475569]/80 sm:text-[11px]">
          This Week
        </p>
        <p className="mt-0.5 text-[20px] font-bold leading-none text-[#0F172A] sm:text-[22px]">
          {card.value}
        </p>
      </div>
    </div>
  );
}
