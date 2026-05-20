export default function CustomerSatisfactionCard({ satisfaction }) {
  const breakdown = satisfaction?.breakdown ?? [];
  const totalShare = breakdown.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0,
  );
  const greatPercent =
    typeof satisfaction?.greatPercent === "number"
      ? satisfaction.greatPercent
      : null;
  const totalReceived = satisfaction?.totalReceived ?? 0;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-bold text-[#111827] sm:text-[15px]">
            Customer satisfaction
          </h3>
          <p className="mt-0.5 text-[11px] font-medium text-[#94A3B8] sm:text-[12px]">
            {totalReceived.toLocaleString()} responses received this week
          </p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-content-center rounded-full bg-gradient-to-br from-[#A7F3D0] to-[#34D399] text-lg text-white shadow-[0_4px_10px_-4px_rgba(52,211,153,0.7)] sm:h-11 sm:w-11 sm:text-xl">
          ☺
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-[28px] font-bold leading-none tracking-tight text-[#0F172A] tabular-nums sm:text-[32px]">
          {greatPercent !== null ? `${greatPercent}%` : "—"}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#64748B] sm:text-[12px]">
          Positive
        </span>
      </div>
      <p className="mt-1 text-[11px] text-[#94A3B8] sm:text-[12px]">
        Happy + Good combined
      </p>

      {totalShare > 0 ? (
        <div className="mt-3 sm:mt-4">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full ring-1 ring-[#F3F4F6]/80 sm:h-3">
            {breakdown.map((item) => {
              const pct = (Number(item.value) || 0) / totalShare * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={item.label}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: item.color,
                  }}
                  className="h-full"
                  title={`${item.label}: ${item.value}%`}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      <ul className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3">
        {breakdown.map((item) => (
          <li key={item.label} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5"
                style={{ backgroundColor: item.color }}
              />
              <p className="truncate text-[11px] font-medium text-[#64748B] sm:text-[12px]">
                {item.label}
              </p>
            </div>
            <p
              className="mt-1 text-[16px] font-bold leading-none tabular-nums sm:text-[18px]"
              style={{ color: item.color }}
            >
              {item.value}%
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
