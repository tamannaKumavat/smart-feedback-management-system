export default function ProjectStatus({ legend = [], total = 299 }) {
  return (
    <article className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[4px] border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4">
      <h2 className="shrink-0 text-[14px] font-bold text-[#111827] sm:text-[15px]">Feedback Status</h2>
      <div className="mt-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto sm:mt-3 sm:gap-3">
        <div
          className="grid aspect-square w-[min(100%,min(150px,28vh))] max-w-[160px] shrink-0 place-items-center rounded-full p-2.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] sm:max-w-[170px] sm:p-3"
          style={{
            background:
              "conic-gradient(from -90deg, #1D79E8 0% 60.4%, #22DFA2 60.4% 86%, #FF8A00 86% 100%)",
          }}
        >
          <div className="grid aspect-square w-[62%] max-w-[112px] place-content-center rounded-full bg-white text-center shadow-[0_2px_8px_rgba(16,24,40,0.06)]">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF] sm:text-[11px]">
              Total
            </p>
            <p className="mt-0.5 text-lg font-bold leading-none text-[#111827] sm:text-[22px]">
              {typeof total === "number" ? `${total}` : total}
            </p>
          </div>
        </div>
        <div className="mt-3 w-full max-w-[220px] space-y-1.5 sm:mt-4 sm:max-w-[240px] sm:space-y-2">
          {legend.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-[12px] sm:text-[13px]"
            >
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2 ${row.dot}`} />
                <span className="truncate font-medium text-[#111827]">{row.label}</span>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-[#111827]">{row.pct}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
