export default function StatusCard({ list, total }) {
  let acc = 0;
  const gradientStops = list
    .map((item) => {
      const start = acc;
      acc += item.value;
      return `${item.color} ${start}% ${acc}%`;
    })
    .join(", ");

  const displayTotal =
    total !== undefined && total !== null
      ? total
      : list.reduce((s, i) => s + i.value, 0);

  return (
    <article className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 sm:mb-3">
        <h3 className="text-[14px] font-bold text-[#111827] sm:text-[15px]">
          Total tickets by status
        </h3>
        <span className="shrink-0 text-[11px] font-medium text-[#94A3B8] sm:text-[12px]">
          All teams ▾
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto sm:gap-3">
        <div
          className="grid aspect-square w-[min(100%,min(150px,28vh))] max-w-[160px] shrink-0 place-items-center rounded-full p-2.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] sm:max-w-[170px] sm:p-3"
          style={{
            background: `conic-gradient(from -90deg, ${gradientStops})`,
          }}
        >
          <div className="grid aspect-square w-[62%] max-w-[100px] place-content-center rounded-full bg-white text-center shadow-[0_2px_8px_rgba(16,24,40,0.06)] sm:max-w-[108px]">
            <p className="text-[9px] font-medium uppercase tracking-wide text-[#9CA3AF] sm:text-[10px]">
              Total
            </p>
            <p className="mt-0.5 text-lg font-bold leading-none text-[#111827] sm:text-xl">
              {displayTotal}
            </p>
          </div>
        </div>

        <div className="w-full min-w-0 max-w-[280px] shrink-0 space-y-1.5 sm:max-w-none sm:space-y-2">
          {list.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-2 text-[12px] sm:text-[13px]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate font-medium text-[#111827]">
                  {item.label}
                </span>
              </div>
              <span
                className="shrink-0 font-semibold tabular-nums"
                style={{ color: item.labelColor ?? item.color }}
              >
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
