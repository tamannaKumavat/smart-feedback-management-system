import { FiCheckCircle } from "react-icons/fi";

export default function ResolvedTasks({
  title = "Resolved tasks",
  items = [],
  onViewAll,
  className = "",
}) {
  const defaultItems = [
    { id: "1", label: "Password reset flow updated", meta: "2h ago" },
    { id: "2", label: "CSV export column mapping", meta: "Yesterday" },
    { id: "3", label: "Notification batching", meta: "3d ago" },
  ];
  const list = items.length > 0 ? items : defaultItems;

  return (
    <article
      className={`flex h-full min-h-0 w-full min-w-0 flex-col rounded-[4px] border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4 ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
        <h2 className="text-[14px] font-bold text-[#111827] sm:text-[15px]">{title}</h2>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[12px] font-semibold text-[#2563EB] hover:underline sm:text-[13px]"
          >
            View all
          </button>
        ) : (
          <span className="text-[12px] font-semibold text-[#2563EB] sm:text-[13px]">View all</span>
        )}
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-[#F3F4F6] overflow-y-auto">
        {list.map((item) => (
          <li key={item.id} className="flex gap-2 py-2 first:pt-0 last:pb-0 sm:gap-3 sm:py-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DFF5E8] text-[#2E7D32] sm:h-8 sm:w-8">
              <FiCheckCircle className="text-[14px] sm:text-[16px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-snug text-[#111827] sm:text-[13px]">
                {item.label}
              </p>
              <p className="mt-0.5 text-[11px] text-[#9CA3AF] sm:text-[12px]">{item.meta}</p>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
