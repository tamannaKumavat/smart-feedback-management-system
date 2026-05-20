export default function PerformanceCard({ card }) {
  const change = typeof card.change === "string" ? card.change.trim() : "";
  const hasChange = change.length > 0;
  const isNegativeNumber = change.startsWith("-");
  // ``isImprovement`` lets the caller decide which direction means "good"
  // (e.g. for resolution time and escalation rate, a decrease is an
  // improvement; for FCR an increase is an improvement). Falls back to
  // sign-based inference when the caller does not specify.
  const isImprovement =
    typeof card.isImprovement === "boolean"
      ? card.isImprovement
      : !isNegativeNumber;
  const arrow = isNegativeNumber ? "↘" : "↗";
  const arrowColor = isImprovement ? "#22C55E" : "#F97316";

  return (
    <div
      className="flex h-full min-h-[118px] flex-col justify-between rounded-xl border border-[#F3F4F6] p-3 text-[#0F172A] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:min-h-[124px] sm:p-4"
      style={{
        background: `linear-gradient(145deg, ${card.bgFrom} 0%, ${card.bgTo} 55%, ${card.bgTo} 100%)`,
      }}
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
          {card.subtitle}
        </p>
        <p className="mt-0.5 text-[20px] font-bold leading-none text-[#0F172A] sm:text-[22px]">
          {card.value}
        </p>
      </div>
    </div>
  );
}
