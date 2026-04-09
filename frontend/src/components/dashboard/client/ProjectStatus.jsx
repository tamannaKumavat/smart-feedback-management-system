import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiFlag,
  FiMessageCircle,
  FiUserPlus,
  FiX,
} from "react-icons/fi";

const ICON_MAP = {
  resolved: FiCheck,
  comment: FiMessageCircle,
  milestone: FiFlag,
  assigned: FiUserPlus,
  edited: FiEdit2,
  priority: FiAlertCircle,
};

function UpdateIcon({ iconKey }) {
  const Icon = ICON_MAP[iconKey] ?? FiCheck;
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D79E8] text-white shadow-sm"
      aria-hidden
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
    </div>
  );
}

export default function ProjectStatus({ title = "Last Updates", groups = [] }) {
  const [feedOpen, setFeedOpen] = useState(true);

  const todayCount = useMemo(() => {
    const today = groups.find((g) => g.id === "today" || g.label === "Today");
    return today?.items?.length ?? 0;
  }, [groups]);

  const updateWord = todayCount === 1 ? "update" : "updates";

  return (
    <article className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[4px] border border-[#F3F4F6] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)]">
      <header className="shrink-0 border-b border-[#F3F4F6] px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold leading-tight text-[#0F172A] sm:text-[16px]">{title}</h2>
            <p className="mt-1 text-[12px] leading-snug text-[#64748B] sm:text-[13px]">
              You have {todayCount} {updateWord} today.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFeedOpen((o) => !o)}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F3F4F6] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BFDBFE] focus-visible:ring-offset-1"
            aria-expanded={feedOpen}
            aria-label={feedOpen ? "Collapse updates" : "Expand updates"}
          >
            {feedOpen ? <FiX className="h-[18px] w-[18px]" strokeWidth={2} /> : <FiChevronDown className="h-[18px] w-[18px]" strokeWidth={2} />}
          </button>
        </div>
      </header>

      {feedOpen ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
          {groups.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-[#64748B]">No recent updates.</p>
          ) : (
            groups.map((group, gi) => (
              <section key={group.id ?? group.label} className={gi > 0 ? "mt-4 border-t border-[#F3F4F6] pt-4" : ""}>
                <h3 className="mb-2 text-[13px] font-bold text-[#111827] sm:text-[14px]">{group.label}</h3>
                <ul className="divide-y divide-[#F3F4F6]">
                  {(group.items ?? []).map((item) => (
                    <li key={item.id} className="flex gap-3 py-3 first:pt-0">
                      <UpdateIcon iconKey={item.iconKey} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold leading-snug text-[#111827] sm:text-[14px]">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#64748B] sm:text-[13px]">
                          {item.description}
                        </p>
                        <p className="mt-2 text-[11px] tabular-nums text-[#9CA3AF] sm:text-[12px]">{item.at}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      ) : null}
    </article>
  );
}
