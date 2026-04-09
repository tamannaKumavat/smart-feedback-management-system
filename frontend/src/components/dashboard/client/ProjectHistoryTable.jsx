import { useMemo, useState } from "react";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";
import Dropdown from "../../Dropdown.jsx";

const PHASE_DEFS = [
  { key: "created", label: "Created" },
  { key: "classified", label: "Classified" },
  { key: "inProgress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "created", label: "Created" },
  { value: "classified", label: "Classified" },
  { value: "inProgress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

const TICKET_PREVIEW_MAX_W = "max-w-[200px] sm:max-w-[280px] lg:max-w-[320px]";

function phaseIndex(phase) {
  const i = PHASE_DEFS.findIndex((p) => p.key === phase);
  return i >= 0 ? i : 0;
}

function TicketTimeline({ phase, timeline = {} }) {
  const active = phaseIndex(phase);
  const fillPct = ((active + 1) / PHASE_DEFS.length) * 100;

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] px-2.5 py-2 sm:px-3 sm:py-2.5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] sm:text-[11px]">
        Ticket history
      </p>
      <div className="relative">
        <div
          className="pointer-events-none absolute left-[8%] right-[8%] top-[15px] z-0 h-[2px] overflow-hidden rounded-full bg-[#E5E7EB] sm:left-[10%] sm:right-[10%] sm:top-[16px]"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-[#22C55E] transition-[width] duration-300 ease-out"
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <div className="relative z-[1] grid grid-cols-4 gap-0.5 sm:gap-0">
          {PHASE_DEFS.map((step, i) => {
            const done = i <= active;
            const entry = timeline[step.key];
            return (
              <div key={step.key} className="flex min-w-0 flex-col items-center text-center">
                <span className="mb-1 min-h-[10px] text-[8px] font-medium leading-tight text-[#94A3B8] sm:min-h-[11px] sm:text-[9px]">
                  {entry?.at ?? ""}
                </span>
                <div
                  className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 sm:h-8 sm:w-8 ${
                    done
                      ? "border-[#16A34A] bg-[#DCFCE7] text-[#15803D]"
                      : "border-[#E5E7EB] bg-white text-[#CBD5E1]"
                  }`}
                >
                  {done ? <FiCheck className="text-[13px] sm:text-[15px]" strokeWidth={2.5} aria-hidden /> : null}
                </div>
                <p className="mt-1 text-[9px] font-bold leading-tight text-[#111827] sm:text-[10px]">{step.label}</p>
                <p className="mt-0.5 line-clamp-2 min-h-[22px] px-0.5 text-[8px] leading-snug text-[#64748B] sm:min-h-[24px] sm:text-[9px]">
                  {entry?.detail ?? "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ProjectHistoryTable({
  title = "My Tickets",
  rows = [],
  onViewDetail,
  dateLabel = "Date",
  feedbackLabel = "Ticket",
  statusLabel = "Status",
  actionLabel = "View history",
  searchPlaceholder = "Search tickets...",
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row, index) => {
      const detail = row.ticket ?? row.feedback ?? "";
      const phase = row.timelinePhase ?? "created";
      if (statusFilter !== "all" && phase !== statusFilter) return false;
      if (!q) return true;
      const hay = `${detail} ${row.date ?? ""} ${row.status ?? ""} ${row.id ?? index}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, statusFilter]);

  function toggleRow(row, id) {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next === id) onViewDetail?.(row);
  }

  return (
    <article className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[4px] border border-[#F3F4F6] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)]">
      {title ? (
        <div className="flex shrink-0 flex-col gap-3 border-b border-[#F3F4F6] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5">
          <h2 className="text-[15px] font-bold text-[#0F172A] sm:text-[16px] lg:text-[17px]">{title}</h2>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:max-w-[min(100%,28rem)] sm:flex-row sm:items-stretch sm:gap-2">
            <div className="relative min-w-0 flex-1">
              <FiSearch
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-[12px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#93C5FD] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]/80 sm:text-[13px]"
                aria-label="Search tickets"
              />
            </div>
            <div className="shrink-0 sm:w-[min(100%,200px)]">
              <label htmlFor="ticket-status-filter" className="sr-only">
                Filter by status
              </label>
              <Dropdown
                id="ticket-status-filter"
                options={FILTER_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid shrink-0 grid-cols-12 gap-1 border-b border-[#F3F4F6] bg-[#FAFAFA] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[12px]">
        <span className="col-span-2">{dateLabel}</span>
        <span className="col-span-5">{feedbackLabel}</span>
        <span className="col-span-3">{statusLabel}</span>
        <span className="col-span-2 text-right"> </span>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-[#F3F4F6] overflow-y-auto overscroll-contain">
        {filteredRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-[#64748B]">No tickets match your filters.</p>
        ) : (
          filteredRows.map((row, index) => {
            const detail = row.ticket ?? row.feedback;
            const rowId = row.id ?? `${row.date}-${detail}-${index}`;
            const open = expandedId === rowId;
            const phase = row.timelinePhase ?? "created";
            const timeline = row.timeline ?? {};
            const showShot = Boolean(row.hasScreenshot);

            return (
              <div key={rowId} className="bg-white">
                <div className="grid grid-cols-12 items-center gap-1 px-3 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
                  <span className="col-span-2 text-[12px] text-[#6B7280] sm:text-[13px]">{row.date}</span>
                  <span
                    className={`col-span-5 block min-w-0 truncate text-[12px] font-medium text-[#111827] sm:text-[13px] ${TICKET_PREVIEW_MAX_W}`}
                    title={detail}
                  >
                    {detail}
                  </span>
                  <span className="col-span-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px] ${row.statusClass ?? ""}`}
                    >
                      {row.status}
                    </span>
                  </span>
                  <span className="col-span-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleRow(row, rowId)}
                      aria-expanded={open}
                      className="inline-flex items-center gap-1 rounded-[4px] border border-[#E5E7EB] bg-white px-2 py-1 text-[10px] font-semibold text-[#374151] shadow-sm transition hover:bg-[#F9FAFB] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px]"
                    >
                      <FiChevronDown
                        className={`text-[14px] text-[#9CA3AF] transition-transform sm:text-[16px] ${open ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                      {actionLabel}
                    </button>
                  </span>
                </div>
                {open ? (
                  <div className="space-y-3 border-t border-[#F3F4F6] bg-[#F8FAFC] px-3 py-3 sm:space-y-3 sm:px-4 sm:py-3">
                    {showShot ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                        <img
                          src="/ticket-dummy.png"
                          alt="Ticket attachment screenshot"
                          className="h-16 w-16 shrink-0 rounded-md border border-[#E5E7EB] bg-white object-contain shadow-sm sm:h-20 sm:w-20"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Description</p>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-[#111827] sm:text-[14px]">{detail}</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Description</p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-[#111827] sm:text-[14px]">{detail}</p>
                      </div>
                    )}
                    <TicketTimeline phase={phase} timeline={timeline} />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
