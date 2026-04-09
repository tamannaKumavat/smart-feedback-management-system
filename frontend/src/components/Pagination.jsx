import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

function buildPageList(current, total) {
  if (total <= 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const set = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("ellipsis");
    out.push(sorted[i]);
  }
  return out;
}

const cellBase =
  "flex h-9 min-w-[2.25rem] items-center justify-center border-r border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] transition-colors last:border-r-0 sm:h-10 sm:min-w-[2.5rem] sm:text-[14px]";

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  className = "",
  "aria-label": ariaLabel = "Pagination",
}) {
  const total = Math.max(0, totalPages);
  if (total <= 0) return null;

  const current = Math.min(Math.max(1, page), total);
  const items = buildPageList(current, total);
  const canPrev = current > 1;
  const canNext = current < total;

  return (
    <nav className={className} aria-label={ariaLabel}>
      <div className="inline-flex overflow-hidden rounded-md border border-[#E5E7EB] shadow-sm">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange?.(current - 1)}
          className={`${cellBase} px-2 hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white`}
          aria-label="Previous page"
        >
          <FiChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
        {items.map((item, i) =>
          item === "ellipsis" ? (
            <span
              key={`e-${i}`}
              className={`${cellBase} cursor-default select-none px-2 text-[#6B7280]`}
              aria-hidden
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange?.(item)}
              className={`${cellBase} min-w-[2.25rem] px-3 hover:bg-[#F9FAFB] sm:min-w-[2.5rem] ${
                item === current ? "bg-[#F3F4F6] font-semibold hover:bg-[#F3F4F6]" : ""
              }`}
              aria-label={`Page ${item}`}
              aria-current={item === current ? "page" : undefined}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={!canNext}
          onClick={() => canNext && onPageChange?.(current + 1)}
          className={`${cellBase} px-2 hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white`}
          aria-label="Next page"
        >
          <FiChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
