export default function SolvedTicketsByDepartment({ items = [] }) {
  const rows = [...items].sort((a, b) => b.solvedPct - a.solvedPct);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-xl border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4">
      <div className="border-b border-[#F3F4F6] pb-2.5 sm:pb-3">
        <h3 className="text-[14px] font-bold text-[#111827] sm:text-[15px]">
          Solved tickets by department
        </h3>
        <p className="mt-0.5 text-[11px] font-medium text-[#94A3B8] sm:text-[12px]">
          Share of tickets resolved per team
        </p>
      </div>

      <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5 sm:mt-4 sm:gap-3.5">
        {rows.map((row) => {
          const fill = row.barColor ?? row.labelColor ?? row.color ?? "#6B46C1";
          const track = row.track ?? "#F1F5F9";
          const pctColor = row.labelColor ?? fill;
          return (
            <li key={row.id ?? row.name}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-[12px] font-semibold text-[#374151] sm:text-[13px]">
                  {row.name}
                </span>
                <span
                  className="shrink-0 text-[13px] font-bold tabular-nums sm:text-[14px]"
                  style={{ color: pctColor }}
                >
                  {row.solvedPct}%
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full ring-1 ring-[#F3F4F6]/80 sm:h-2.5"
                style={{ backgroundColor: track }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(0, row.solvedPct))}%`,
                    backgroundColor: fill,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
