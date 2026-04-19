export default function PerformanceCard({ card }) {
  return (
    <div
      className="flex h-full min-h-[118px] flex-col justify-between rounded-xl border border-[#F3F4F6] p-3 text-[#0F172A] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:min-h-[124px] sm:p-4"
      style={{
        background: `linear-gradient(145deg, ${card.bgFrom} 0%, ${card.bgTo} 55%, ${card.bgTo} 100%)`,
      }}
    >
      <p className="text-[12px] font-semibold leading-snug text-[#1E293B]/90 sm:text-[13px]">{card.title}</p>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#475569]/80 sm:text-[11px]">
          {card.subtitle}
        </p>
        <p className="mt-0.5 text-[20px] font-bold leading-none text-[#0F172A] sm:text-[22px]">{card.value}</p>
      </div>
    </div>
  );
}
