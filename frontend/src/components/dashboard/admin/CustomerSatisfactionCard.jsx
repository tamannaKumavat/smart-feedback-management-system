export default function CustomerSatisfactionCard({ satisfaction }) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto rounded-xl border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4">
      <h3 className="text-[14px] font-bold text-[#111827] sm:text-[15px]">Customer satisfaction</h3>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3">
        <div>
          <p className="text-[10px] font-medium text-[#94A3B8] sm:text-[11px]">Total received</p>
          <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[#111827] sm:text-[20px]">
            {satisfaction.totalReceived}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-[#94A3B8] sm:text-[11px]">Great</p>
          <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[#111827] sm:text-[20px]">
            %{satisfaction.greatPercent}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <div className="grid h-9 w-9 place-content-center rounded-full bg-[#D1FAE5] text-lg text-[#047857] shadow-sm sm:h-10 sm:w-10 sm:text-xl">
            ☺
          </div>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-[#F1F5F9] sm:mt-4">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#6EE7B7] to-[#34D399]"
          style={{ width: `${satisfaction.greatPercent}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3">
        {satisfaction.breakdown.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] font-medium text-[#94A3B8] sm:text-[11px]">{item.label}</p>
            <p className="mt-0.5 text-[13px] font-semibold tabular-nums sm:text-[14px]" style={{ color: item.color }}>
              %{item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
