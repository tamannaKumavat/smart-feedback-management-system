import { FiChevronRight } from "react-icons/fi";

export default function ProjectHistoryTable({
  title = "Projects",
  rows = [],
  onViewDetail,
  dateLabel = "Date",
  feedbackLabel = "Ticket",
  statusLabel = "Status",
  actionLabel = "View detail",
}) {
  return (
    <article className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[4px] border border-[#F3F4F6] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)]">
      {title ? (
        <div className="border-b border-[#F3F4F6] px-3 py-2.5 sm:px-4 sm:py-3">
          <h2 className="text-[14px] font-bold text-[#111827] sm:text-[15px]">{title}</h2>
        </div>
      ) : null}
      <div className="grid grid-cols-12 gap-1 border-b border-[#F3F4F6] bg-[#FAFAFA] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[12px]">
        <span className="col-span-2">{dateLabel}</span>
        <span className="col-span-5">{feedbackLabel}</span>
        <span className="col-span-3">{statusLabel}</span>
        <span className="col-span-2 text-right"> </span>
      </div>
      <div className="min-h-0 flex-1 divide-y divide-[#F3F4F6] overflow-y-auto">
        {rows.map((row) => {
          const detail = row.ticket ?? row.feedback;
          return (
          <div
            key={`${row.date}-${detail}`}
            className="grid grid-cols-12 items-center gap-1 px-3 py-2 sm:gap-2 sm:px-4 sm:py-2.5"
          >
            <span className="col-span-2 text-[12px] text-[#6B7280] sm:text-[13px]">{row.date}</span>
            <span className="col-span-5 min-w-0 truncate text-[12px] font-medium text-[#111827] sm:text-[13px]">
              {detail}
            </span>
            <span className="col-span-3">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px] ${row.statusClass}`}
              >
                {row.status}
              </span>
            </span>
            <span className="col-span-2 text-right">
              <button
                type="button"
                onClick={() => onViewDetail?.(row)}
                className="inline-flex items-center gap-1 rounded-[4px] border border-[#E5E7EB] bg-white px-2 py-1 text-[10px] font-semibold text-[#374151] shadow-sm transition hover:bg-[#F9FAFB] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px]"
              >
                <FiChevronRight className="text-[12px] text-[#9CA3AF] sm:text-[14px]" />
                {actionLabel}
              </button>
            </span>
          </div>
        );
        })}
      </div>
    </article>
  );
}
