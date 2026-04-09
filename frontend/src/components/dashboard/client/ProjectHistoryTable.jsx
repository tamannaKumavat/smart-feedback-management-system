import { useMemo, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiCircle,
  FiEdit3,
  FiLayers,
  FiSearch,
  FiZap,
} from "react-icons/fi";
import Dropdown from "../../Dropdown.jsx";

const PHASE_DEFS = [
  { key: "created", label: "Created", Icon: FiEdit3 },
  { key: "classified", label: "Classified", Icon: FiLayers },
  { key: "inProgress", label: "In Progress", Icon: FiZap },
  { key: "resolved", label: "Resolved", Icon: FiCheck },
];

const PHASE_ROW_STATUS = {
  created: { label: "Created", badgeClass: "bg-[#F3F4F6] text-[#475569]" },
  classified: {
    label: "Classified",
    badgeClass: "bg-[#FFF7D6] text-[#92400E]",
  },
  inProgress: {
    label: "In Progress",
    badgeClass: "bg-[#E3F0FF] text-[#1E3A8A]",
  },
  resolved: { label: "Resolved", badgeClass: "bg-[#DFF5E8] text-[#2E7D32]" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "created", label: "Created" },
  { value: "classified", label: "Classified" },
  { value: "inProgress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

function phaseRowStatus(phase) {
  const key = phase ?? "created";
  return PHASE_ROW_STATUS[key] ?? PHASE_ROW_STATUS.created;
}

const ROW_DATE_W = "w-[5.75rem] shrink-0 sm:w-32";
const ROW_RIGHT_GRID =
  "grid min-h-0 min-w-0 max-w-full flex-[0_1_20rem] grid-cols-2 gap-x-2 [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)] sm:max-w-[20rem] sm:gap-x-4";

function phaseIndex(phase) {
  const i = PHASE_DEFS.findIndex((p) => p.key === phase);
  return i >= 0 ? i : 0;
}

function TimelineStepIcon({ step, i, active }) {
  const completed = i < active;
  const current = i === active;
  const PhaseIcon = step.Icon;

  if (completed) {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#15803D] bg-[#DCFCE7] text-[#15803D] shadow-sm sm:h-8 sm:w-8"
        aria-hidden
      >
        <FiCheck className="text-[13px] sm:text-[15px]" strokeWidth={2.5} />
      </div>
    );
  }

  if (current) {
    return (
      <div
        className="rounded-full border-2 border-dashed border-[#22C55E] bg-white p-[2px] shadow-sm sm:p-[3px]"
        aria-current="step"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-inner sm:h-8 sm:w-8">
          <PhaseIcon
            className="text-[12px] sm:text-[14px]"
            strokeWidth={2.25}
            aria-hidden
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#E5E7EB] bg-[#F3F4F6] text-[#94A3B8] sm:h-8 sm:w-8"
      aria-hidden
    >
      <FiCircle className="text-[11px] sm:text-[12px]" strokeWidth={2} />
    </div>
  );
}

function TicketTimeline({ phase, timeline = {} }) {
  const active = phaseIndex(phase);
  const segmentCount = PHASE_DEFS.length - 1;

  return (
    <div className="min-w-0 rounded-lg border border-[#E5E7EB] bg-white px-2 py-2 shadow-sm sm:px-3 sm:py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[#64748B] sm:text-[10px]">
        Ticket history
      </p>

      <div className="mt-1.5 grid grid-cols-4 gap-x-1 gap-y-0 text-center">
        {PHASE_DEFS.map((step) => {
          const entry = timeline[step.key];
          return (
            <span
              key={`${step.key}-at`}
              className="min-h-[10px] text-[7px] font-medium leading-tight text-[#94A3B8] sm:min-h-[11px] sm:text-[8px]"
            >
              {entry?.at ?? ""}
            </span>
          );
        })}
      </div>

      <div className="relative mt-1 flex min-h-[34px] items-center px-0.5 sm:min-h-[38px]">
        <div
          className="absolute left-1.5 right-1.5 top-1/2 z-0 flex h-[2px] -translate-y-1/2 overflow-hidden rounded-full sm:left-2 sm:right-2"
          aria-hidden
        >
          {Array.from({ length: segmentCount }, (_, seg) => (
            <div
              key={seg}
              className={`h-full flex-1 first:rounded-l-full last:rounded-r-full ${
                active > seg ? "bg-[#16A34A]" : "bg-[#E5E7EB]"
              }`}
            />
          ))}
        </div>
        <div className="relative z-[1] flex w-full justify-between gap-1">
          {PHASE_DEFS.map((step, i) => (
            <div
              key={step.key}
              className="flex min-w-0 flex-1 flex-col items-center"
            >
              <TimelineStepIcon step={step} i={i} active={active} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-x-1 text-center">
        {PHASE_DEFS.map((step) => (
          <p
            key={`${step.key}-label`}
            className="text-[8px] font-bold leading-tight text-[#111827] sm:text-[9px]"
          >
            {step.label}
          </p>
        ))}
      </div>

      <div className="mt-0.5 grid grid-cols-4 gap-x-1 text-center">
        {PHASE_DEFS.map((step) => {
          const entry = timeline[step.key];
          return (
            <p
              key={`${step.key}-detail`}
              className="line-clamp-2 min-h-[1.5rem] px-0.5 text-[7px] leading-snug text-[#64748B] sm:min-h-[1.625rem] sm:text-[8px]"
            >
              {entry?.detail ?? "—"}
            </p>
          );
        })}
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
      const phaseLabel = phaseRowStatus(phase).label;
      const hay =
        `${detail} ${row.date ?? ""} ${phaseLabel} ${row.id ?? index}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, statusFilter]);

  function toggleRow(row, id) {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next === id) onViewDetail?.(row);
  }

  return (
    <article className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)]">
      {title ? (
        <div className="flex min-w-0 shrink-0 flex-col gap-3 border-b border-[#F3F4F6] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5">
          <h2 className="min-w-0 shrink-0 text-[15px] font-bold leading-tight text-[#0F172A] sm:text-[16px] lg:text-[17px]">
            {title}
          </h2>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-[min(100%,32rem)] sm:flex-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <div className="relative min-w-0 w-full sm:min-w-0 sm:flex-1 sm:basis-0">
              <FiSearch
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="box-border h-10 w-full rounded-lg border border-[#E5E7EB] bg-white py-0 pl-9 pr-3 text-[12px] leading-none text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#93C5FD] focus:outline-none focus:ring-2 focus:ring-[#BFDBFE]/80 sm:text-[13px]"
                aria-label="Search tickets"
              />
            </div>
            <div className="min-w-0 w-full sm:flex-1 sm:basis-0">
              <label htmlFor="ticket-status-filter" className="sr-only">
                Filter by status
              </label>
              <Dropdown
                id="ticket-status-filter"
                options={FILTER_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                aria-label="Filter by status"
                labelClassName="text-[#1E3A8A] font-medium"
                chevronClassName="text-[#1E3A8A]"
                menuClassName="!mt-1.5 !rounded-xl !border-[#BFDBFE] !py-1.5"
                menuShadowClass="shadow-[0_12px_40px_-8px_rgba(30,58,138,0.14),0_4px_12px_-2px_rgba(30,64,175,0.08)]"
                selectedOptionClassName="bg-[#E3F0FF] text-[#1E3A8A]"
                unselectedOptionClassName="text-[#374151] hover:bg-[#EFF6FF] hover:text-[#1E3A8A]"
                buttonClassName="!h-10 !min-h-0 !gap-2 !rounded-[6px] !border-[#93C5FD]  !py-0 !pl-3 !pr-2.5 !text-[12px] !font-medium !leading-none !text-[#1E3A8A] !shadow-none hover:!border-[#60A5FA] hover:!bg-[#DBEAFE] focus-visible:!border-[#3B82F6] focus-visible:!ring-2 focus-visible:!ring-[#BFDBFE] sm:!rounded-lg sm:!py-0 sm:!text-[13px]"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-[#F3F4F6] bg-[#FAFAFA] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] sm:gap-4 sm:px-4 sm:py-2.5 sm:text-[12px]">
        <span className={`${ROW_DATE_W} flex min-h-[1.25rem] items-center`}>
          {dateLabel}
        </span>
        <span className="min-h-[1.25rem] min-w-0 flex-1">{feedbackLabel}</span>
        <div className={`${ROW_RIGHT_GRID} min-h-[1.25rem] items-center`}>
          <span className="flex justify-end text-right">{statusLabel}</span>
          <span className="flex justify-end text-right">{actionLabel}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-[#F3F4F6] overflow-y-auto overscroll-contain">
        {filteredRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-[#64748B]">
            No tickets match your filters.
          </p>
        ) : (
          filteredRows.map((row, index) => {
            const detail = row.ticket ?? row.feedback;
            const rowId = row.id ?? `${row.date}-${detail}-${index}`;
            const open = expandedId === rowId;
            const phase = row.timelinePhase ?? "created";
            const timeline = row.timeline ?? {};
            const showShot = Boolean(row.hasScreenshot);
            const { label: phaseLabel, badgeClass: phaseBadgeClass } =
              phaseRowStatus(phase);

            return (
              <div key={rowId} className="bg-white">
                <button
                  type="button"
                  onClick={() => toggleRow(row, rowId)}
                  aria-expanded={open}
                  className="group flex w-full min-w-0 cursor-pointer items-center gap-2 border-0 px-3 py-2 text-left transition-colors hover:bg-[#F2F7FF] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#BFDBFE] focus-visible:ring-offset-2 sm:gap-4 sm:px-4 sm:py-2.5"
                >
                  <span
                    className={`${ROW_DATE_W} flex min-h-0 items-center text-left text-[12px] text-[#6B7280] sm:text-[13px]`}
                  >
                    {row.date}
                  </span>
                  <span
                    className="flex min-h-0 min-w-0 flex-1 items-center text-[12px] font-medium leading-snug text-[#111827] sm:text-[13px]"
                    title={detail}
                  >
                    <span className="min-w-0 truncate">{detail}</span>
                  </span>
                  <div className={`${ROW_RIGHT_GRID} min-h-0 items-center`}>
                    <div className="flex min-w-0 justify-end ">
                      <div className="w-20  relative left-3 flex justify-center items-center">
                        <span
                          className={`inline-flex max-w-full shrink-0 items-center truncate rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight sm:px-2.5 sm:py-1 sm:text-[11px] ${phaseBadgeClass}`}
                        >
                          {phaseLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex min-w-0 justify-end">
                      <span className="inline-flex max-w-full items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2 py-1 text-[10px] font-semibold leading-tight text-[#374151] shadow-sm transition group-hover:border-[#BBF7D0] group-hover:bg-[#F0FDF4] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px]">
                        <FiChevronDown
                          className={`shrink-0 text-[14px] text-[#9CA3AF] transition-transform sm:text-[16px] ${open ? "rotate-180" : ""}`}
                          aria-hidden
                        />
                        <span className="truncate">{actionLabel}</span>
                      </span>
                    </div>
                  </div>
                </button>
                {open ? (
                  <div className="min-w-0 space-y-3  overflow-x-hidden border-t border-[#F3F4F6] bg-[#EEF2FA] p-6 sm:space-y-4 ">
                    {showShot ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                        <img
                          src="/ticket-dummy.png"
                          alt="Ticket attachment screenshot"
                          className="h-16 w-16 shrink-0 rounded-md border border-[#E5E7EB] bg-white object-contain shadow-sm sm:h-20 sm:w-20"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                            Description
                          </p>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-[#111827] sm:text-[14px]">
                            {detail}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                          Description
                        </p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-[#111827] sm:text-[14px]">
                          {detail}
                        </p>
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
