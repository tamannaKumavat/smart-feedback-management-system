import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { expandCollapse, fadeInUp } from "../../../lib/motion.js";
import {
  FiCheck,
  FiChevronDown,
  FiCircle,
  FiEdit3,
  FiLayers,
  FiMessageSquare,
  FiSearch,
  FiZap,
} from "react-icons/fi";
import Dropdown from "../../Dropdown.jsx";
import ChatHistoryModal from "./ChatHistoryModal.jsx";

const PHASE_DEFS = [
  { key: "created", label: "Created", Icon: FiEdit3 },
  { key: "classified", label: "Classified", Icon: FiLayers },
  { key: "inProgress", label: "In Progress", Icon: FiZap },
  { key: "resolved", label: "Resolved", Icon: FiCheck },
];

const PHASE_ROW_STATUS = {
  created: { label: "Created", badgeClass: "client-phase-badge--created" },
  classified: {
    label: "Classified",
    badgeClass: "client-phase-badge--classified",
  },
  inProgress: {
    label: "In Progress",
    badgeClass: "client-phase-badge--inProgress",
  },
  resolved: { label: "Resolved", badgeClass: "client-phase-badge--resolved" },
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

const TEAM_AVATAR = "/ruag-single.png";

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
        className="client-timeline-step--done flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 shadow-sm sm:h-8 sm:w-8"
        aria-hidden
      >
        <FiCheck className="text-[13px] sm:text-[15px]" strokeWidth={2.5} />
      </div>
    );
  }

  if (current) {
    return (
      <div
        className="client-timeline-step--current-ring rounded-full border-2 border-dashed p-[2px] shadow-sm sm:p-[3px]"
        aria-current="step"
      >
        <div className="client-timeline-step--current flex h-7 w-7 items-center justify-center rounded-full shadow-inner sm:h-8 sm:w-8">
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
      className="client-timeline-step--pending flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 sm:h-8 sm:w-8"
      aria-hidden
    >
      <FiCircle className="text-[11px] sm:text-[12px]" strokeWidth={2} />
    </div>
  );
}

function formatResponseTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function teamResponseFromRow(row) {
  const text = String(row.response ?? "").trim();
  if (text) {
    const comments = Array.isArray(row.responseComments)
      ? row.responseComments
      : [];
    const latest = comments.length ? comments[comments.length - 1] : null;
    return {
      text,
      at: latest?.created ?? latest?.updated ?? null,
      author: latest?.author?.display_name ?? null,
    };
  }

  const comments = Array.isArray(row.responseComments)
    ? row.responseComments
    : [];
  const withBody = comments.filter((c) => String(c?.body ?? "").trim());
  if (!withBody.length) return null;
  const latest = withBody[withBody.length - 1];
  return {
    text: String(latest.body).trim(),
    at: latest.created ?? latest.updated ?? null,
    author: latest.author?.display_name ?? null,
  };
}

function TeamAvatar() {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface-card shadow-sm sm:h-10 sm:w-10">
      <img
        src={TEAM_AVATAR}
        alt="Ruag Team"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function RuagTeamResponse({ row }) {
  const reply = teamResponseFromRow(row);
  if (!reply) return null;

  const timeLabel = formatResponseTime(reply.at);
  const resolvedBy = String(row.resolvedBy ?? "").trim();

  return (
    <section
      className="client-team-response rounded-xl border border-[var(--client-accent)]/25 bg-surface-card p-4 shadow-sm sm:p-5"
      aria-label="Response from Ruag team"
    >
      <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--client-accent)]/10 text-[var(--client-accent)]">
          <FiMessageSquare className="text-[15px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">
            Team response
          </p>
          <p className="text-[12px] text-content-muted sm:text-[13px]">
            Update from the Ruag support team
          </p>
        </div>
      </div>

      <div className="client-chat-row client-chat-row--team mt-4 flex w-full">
        <article className="flex min-w-0 max-w-full flex-col items-start gap-1.5">
          <p className="text-[12px] leading-none">
            <span className="font-semibold text-dashboard-heading">
              Ruag Team
            </span>

            {timeLabel ? (
              <span className="text-content-muted"> · {timeLabel}</span>
            ) : null}
          </p>
          <div className="flex max-w-full items-end gap-2.5">
            <TeamAvatar />
            <div className="client-chat-bubble-team min-w-0 max-w-[min(100%,36rem)] rounded-2xl rounded-bl-md px-4 py-3 text-[13px] leading-relaxed shadow-sm sm:text-[14px]">
              <p className="whitespace-pre-wrap">{reply.text}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function TicketTimeline({ phase, timeline = {} }) {
  const active = phaseIndex(phase);
  const segmentCount = PHASE_DEFS.length - 1;

  return (
    <div className="client-ticket-timeline min-w-0 rounded-lg px-2 py-2 sm:px-3 sm:py-2.5">
      <p className="client-timeline-heading text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]">
        Ticket history
      </p>

      <div className="mt-1.5 grid grid-cols-4 gap-x-1 gap-y-0 text-center">
        {PHASE_DEFS.map((step) => {
          const entry = timeline[step.key];
          return (
            <span
              key={`${step.key}-at`}
              className="client-timeline-muted min-h-[10px] text-[7px] font-medium leading-tight sm:min-h-[11px] sm:text-[8px]"
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
                active > seg
                  ? "client-timeline-track--active"
                  : "client-timeline-track"
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
            className="client-timeline-title text-[8px] font-bold leading-tight sm:text-[9px]"
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
              className="client-timeline-muted line-clamp-2 min-h-[1.5rem] px-0.5 text-[7px] leading-snug sm:min-h-[1.625rem] sm:text-[8px]"
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
  feedbackLabel = "Title",
  statusLabel = "Status",
  actionLabel = "View history",
  searchPlaceholder = "Search tickets...",
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [chatHistoryIssue, setChatHistoryIssue] = useState(null);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row, index) => {
      const title = row.ticket ?? row.feedback ?? "";
      const description = row.description ?? title;
      const phase = row.timelinePhase ?? "created";
      if (statusFilter !== "all" && phase !== statusFilter) return false;
      if (!q) return true;
      const phaseLabel = phaseRowStatus(phase).label;
      const hay =
        `${title} ${description} ${row.date ?? ""} ${phaseLabel} ${row.id ?? index}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, statusFilter]);

  function toggleRow(row, id) {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next === id) onViewDetail?.(row);
  }

  return (
    <motion.article
      className="client-card flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={{ ...fadeInUp.transition, delay: 0.08 }}
    >
      {title ? (
        <div className="client-separator flex min-w-0 shrink-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5">
          <h2 className="min-w-0 shrink-0 text-[15px] font-bold leading-tight text-dashboard-heading sm:text-[16px] lg:text-[17px]">
            {title}
          </h2>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-[min(100%,32rem)] sm:flex-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <label className="client-search-field flex h-10 min-w-0 w-full items-center gap-2.5 rounded-xl border border-border-input bg-surface-card px-3 shadow-sm sm:min-w-0 sm:flex-1 sm:basis-0">
              <FiSearch
                className="h-4 w-4 shrink-0 text-content-muted"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-content placeholder:text-content-muted focus:outline-none focus:ring-0 sm:text-[13px]"
                aria-label="Search tickets"
              />
            </label>
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
                labelClassName="text-[var(--client-accent)] font-medium"
                chevronClassName="text-[var(--client-accent)]"
                menuClassName="!mt-1.5 !rounded-xl !border-border-subtle !bg-surface-card !py-1.5"
                menuShadowClass="shadow-card"
                selectedOptionClassName="bg-surface-muted text-[var(--client-accent)]"
                unselectedOptionClassName="text-content hover:bg-surface-muted hover:text-[var(--client-accent)]"
                buttonClassName="!h-10 !min-h-0 !gap-2 !rounded-lg !border-border-input !bg-surface-card !py-0 !pl-3 !pr-2.5 !text-[12px] !font-medium !leading-none !text-[var(--client-accent)] !shadow-none hover:!bg-surface-muted focus-visible:!ring-2 focus-visible:!ring-brand-gray/30 sm:!text-[13px]"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="client-separator flex min-w-0 shrink-0 items-center gap-2 bg-surface-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-content-muted sm:gap-4 sm:px-4 sm:py-2.5 sm:text-[12px]">
        <span className={`${ROW_DATE_W} flex min-h-[1.25rem] items-center`}>
          {dateLabel}
        </span>
        <span className="min-h-[1.25rem] min-w-0 flex-1">{feedbackLabel}</span>
        <div className={`${ROW_RIGHT_GRID} min-h-[1.25rem] items-center`}>
          <span className="flex justify-end text-right">{statusLabel}</span>
          <span className="flex justify-end text-right">{actionLabel}</span>
        </div>
      </div>

      <div className="client-divide min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
        {filteredRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-content-muted">
            No tickets match your filters.
          </p>
        ) : (
          filteredRows.map((row, index) => {
            const title = row.ticket ?? row.feedback ?? "";
            const detail = row.description ?? title;
            const rowId = row.id ?? `${row.date}-${detail}-${index}`;
            const open = expandedId === rowId;
            const phase = row.timelinePhase ?? "created";
            const timeline = row.timeline ?? {};
            const showShot = Boolean(row.hasScreenshot);
            const hasTeamResponse = Boolean(teamResponseFromRow(row));
            const { label: phaseLabel, badgeClass: phaseBadgeClass } =
              phaseRowStatus(phase);

            return (
              <div key={rowId} className="bg-surface-card">
                <button
                  type="button"
                  onClick={() => toggleRow(row, rowId)}
                  aria-expanded={open}
                  className="group flex w-full min-w-0 cursor-pointer items-center gap-2 border-0 px-3 py-4 text-left transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:ring-2 focus-visible:ring-brand-gray/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card sm:gap-4 sm:px-4 sm:py-4"
                >
                  <span
                    className={`${ROW_DATE_W} flex min-h-0 items-center text-left text-[12px] text-content-muted sm:text-[13px]`}
                  >
                    {row.date}
                  </span>
                  <span
                    className="flex min-h-0 min-w-0 flex-1 items-center text-[12px] font-medium leading-snug text-content sm:text-[13px]"
                    title={title}
                  >
                    <span className="min-w-0 truncate">{title}</span>
                  </span>
                  <div className={`${ROW_RIGHT_GRID} min-h-0 items-center`}>
                    <div className="flex min-w-0 justify-end ">
                      <div className="w-20  relative left-3 flex justify-center items-center">
                        <span
                          className={`inline-flex max-w-full shrink-0 items-center truncate rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight sm:px-2.5 sm:py-1 sm:text-[11px] client-phase-badge ${phaseBadgeClass}`}
                        >
                          {phaseLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex min-w-0 justify-end">
                      <span className="relative inline-flex max-w-full items-center gap-1 rounded-lg border border-border-subtle bg-surface-card px-2 py-1 text-[10px] font-semibold leading-tight text-content shadow-sm transition group-hover:border-[var(--client-accent)]/40 group-hover:bg-surface-muted sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px]">
                        <FiChevronDown
                          className={`shrink-0 text-[14px] text-content-muted transition-transform sm:text-[16px] ${open ? "rotate-180" : ""}`}
                          aria-hidden
                        />
                        <span className="truncate">{actionLabel}</span>
                        {hasTeamResponse ? (
                          <span
                            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--client-accent)] ring-2 ring-surface-card"
                            title="Team response available"
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    </div>
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      key="detail"
                      className="min-w-0 space-y-3 overflow-x-hidden border-t border-border-subtle bg-surface-muted p-6 sm:space-y-4"
                      initial={expandCollapse.initial}
                      animate={expandCollapse.animate}
                      exit={expandCollapse.exit}
                      transition={expandCollapse.transition}
                    >
                      {showShot ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
                          <img
                            src="/ticket-dummy.png"
                            alt="Ticket attachment screenshot"
                            className="h-16 w-16 shrink-0 rounded-md border border-border-subtle bg-surface-card object-contain shadow-sm sm:h-20 sm:w-20"
                            loading="lazy"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                              Description
                            </p>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-content sm:text-[14px]">
                              {detail}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                            Description
                          </p>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-content sm:text-[14px]">
                            {detail}
                          </p>
                        </div>
                      )}
                      <RuagTeamResponse row={row} />
                      <TicketTimeline phase={phase} timeline={timeline} />
                      {row.id ? (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChatHistoryIssue({
                                id: row.id,
                                title: title,
                              });
                            }}
                            className="client-btn-secondary"
                          >
                            See chat history
                          </button>
                        </div>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      <ChatHistoryModal
        open={Boolean(chatHistoryIssue)}
        issueId={chatHistoryIssue?.id}
        issueTitle={chatHistoryIssue?.title}
        onClose={() => setChatHistoryIssue(null)}
      />
    </motion.article>
  );
}
