import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  localizeTableProp,
  TABLE_LABEL_ALIASES,
  TABLE_TITLE_ALIASES,
} from "@/i18n/clientDashboard.js";
import { useTranslation } from "@/i18n/useTranslation.js";
import { fadeInUp } from "../../../lib/motion.js";
import { FiChevronRight, FiSearch } from "react-icons/fi";
import Dropdown from "../../Dropdown.jsx";
import IssueDetailModal from "./IssueDetailModal.jsx";

const PHASE_BADGE_CLASS = {
  created: "client-phase-badge--created",
  classified: "client-phase-badge--classified",
  inProgress: "client-phase-badge--inProgress",
  resolved: "client-phase-badge--resolved",
};

const PHASE_KEYS = ["created", "classified", "inProgress", "resolved"];

function useFilterOptions(t) {
  return useMemo(
    () => [
      { value: "all", label: t("historyTable.allStatuses") },
      ...PHASE_KEYS.map((key) => ({
        value: key,
        label: t(`historyTable.phases.${key}`),
      })),
    ],
    [t],
  );
}

function phaseRowStatus(phase, t) {
  const key = PHASE_KEYS.includes(phase) ? phase : "created";
  return {
    label: t(`historyTable.phases.${key}`),
    badgeClass: PHASE_BADGE_CLASS[key] ?? PHASE_BADGE_CLASS.created,
  };
}

function teamResponseFromRow(row) {
  const text = String(row.response ?? "").trim();
  if (text) return true;
  const comments = Array.isArray(row.responseComments)
    ? row.responseComments
    : [];
  return comments.some((c) => String(c?.body ?? "").trim());
}

const ROW_DATE_W = "w-[5.75rem] shrink-0 sm:w-32";
const ROW_RIGHT_GRID =
  "grid min-h-0 min-w-0 max-w-full flex-[0_1_20rem] grid-cols-2 gap-x-2 [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)] sm:max-w-[20rem] sm:gap-x-4";

export default function ProjectHistoryTable({
  title = "My Tickets",
  rows = [],
  onViewDetail,
  dateLabel = "Date",
  feedbackLabel = "Title",
  statusLabel = "Status",
  actionLabel = "View details",
  searchPlaceholder = "Search tickets...",
}) {
  const { t } = useTranslation();
  const filterOptions = useFilterOptions(t);
  const localizedTitle = localizeTableProp(t, title, TABLE_TITLE_ALIASES);
  const localizedDateLabel = localizeTableProp(t, dateLabel, TABLE_LABEL_ALIASES);
  const localizedFeedbackLabel = localizeTableProp(
    t,
    feedbackLabel,
    TABLE_LABEL_ALIASES,
  );
  const localizedStatusLabel = localizeTableProp(
    t,
    statusLabel,
    TABLE_LABEL_ALIASES,
  );
  const localizedActionLabel = localizeTableProp(
    t,
    actionLabel,
    TABLE_LABEL_ALIASES,
  );
  const localizedSearchPlaceholder = localizeTableProp(
    t,
    searchPlaceholder,
    TABLE_LABEL_ALIASES,
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRow, setSelectedRow] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row, index) => {
      const rowTitle = row.ticket ?? row.feedback ?? "";
      const description = row.description ?? rowTitle;
      const phase = row.timelinePhase ?? "created";
      if (statusFilter !== "all" && phase !== statusFilter) return false;
      if (!q) return true;
      const phaseLabel = phaseRowStatus(phase, t).label;
      const hay =
        `${rowTitle} ${description} ${row.date ?? ""} ${phaseLabel} ${row.id ?? index}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, statusFilter, t]);

  function openDetail(row) {
    setSelectedRow(row);
    setDetailOpen(true);
    onViewDetail?.(row);
  }

  function closeDetail() {
    setDetailOpen(false);
  }

  function handleDetailExited() {
    setSelectedRow(null);
  }

  return (
    <motion.article
      className="client-issues-panel flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden md:client-card"
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={{ ...fadeInUp.transition, delay: 0.08 }}
    >
      {localizedTitle ? (
        <div className="client-issues-toolbar client-separator flex min-w-0 shrink-0 flex-col gap-3 px-1 py-3 sm:px-4 sm:py-3.5 md:flex-row md:items-center md:justify-between md:gap-4 md:px-4">
          <div className="flex min-w-0 items-center justify-between gap-3 md:justify-start">
            <h2 className="min-w-0 shrink-0 text-[16px] font-bold leading-tight tracking-tight text-dashboard-heading sm:text-[16px] lg:text-[17px]">
              {localizedTitle}
            </h2>
            <span className="inline-flex shrink-0 items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-content-muted md:hidden">
              {filteredRows.length}
            </span>
          </div>
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
                placeholder={localizedSearchPlaceholder}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-content placeholder:text-content-muted focus:outline-none focus:ring-0 sm:text-[13px]"
                aria-label={t("historyTable.searchTicketsAria")}
              />
            </label>
            <div className="min-w-0 w-full sm:flex-1 sm:basis-0">
              <label htmlFor="ticket-status-filter" className="sr-only">
                {t("historyTable.filterByStatus")}
              </label>
              <Dropdown
                id="ticket-status-filter"
                options={filterOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                aria-label={t("historyTable.filterByStatus")}
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

      <div className="client-separator hidden min-w-0 shrink-0 items-center gap-2 bg-surface-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-content-muted md:flex sm:gap-4 sm:px-4 sm:py-2.5 sm:text-[12px]">
        <span className={`${ROW_DATE_W} flex min-h-[1.25rem] items-center`}>
          {localizedDateLabel}
        </span>
        <span className="min-h-0 min-w-0 flex-1">{localizedFeedbackLabel}</span>
        <div className={`${ROW_RIGHT_GRID} min-h-[1.25rem] items-center`}>
          <span className="flex justify-end text-right">{localizedStatusLabel}</span>
          <span className="flex justify-end text-right">{localizedActionLabel}</span>
        </div>
      </div>

      <div className="client-issues-mobile-list min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-4 pt-4 md:p-0 md:pt-0">
        <ul className="flex list-none flex-col gap-3 md:gap-0 md:divide-y md:divide-border-subtle client-divide">
        {filteredRows.length === 0 ? (
          <li className="px-2 py-10 text-center text-[13px] text-content-muted md:px-4">
            {t("historyTable.noTicketsMatch")}
          </li>
        ) : (
          filteredRows.map((row, index) => {
            const rowTitle = row.ticket ?? row.feedback ?? "";
            const detail = row.description ?? rowTitle;
            const rowId = row.id ?? `${row.date}-${detail}-${index}`;
            const phase = row.timelinePhase ?? "created";
            const hasTeamResponse = teamResponseFromRow(row);
            const { label: phaseLabel, badgeClass: phaseBadgeClass } =
              phaseRowStatus(phase, t);
            const showDetailPreview =
              detail.trim().toLowerCase() !== rowTitle.trim().toLowerCase();
            const displayTitle = rowTitle || t("historyTable.fallbackTitle");

            return (
              <li key={rowId} className="md:bg-surface-card">
                {/* Desktop / tablet table row */}
                <button
                  type="button"
                  onClick={() => openDetail(row)}
                  className="group hidden w-full min-w-0 cursor-pointer items-center gap-2 border-0 px-3 py-4 text-left transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:ring-2 focus-visible:ring-brand-gray/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card md:flex sm:gap-4 sm:px-4 sm:py-4"
                >
                  <span
                    className={`${ROW_DATE_W} flex min-h-0 items-center text-left text-[12px] text-content-muted sm:text-[13px]`}
                  >
                    {row.date}
                  </span>
                  <span
                    className="flex min-h-0 min-w-0 flex-1 items-center text-[12px] font-medium leading-snug text-content sm:text-[13px]"
                    title={rowTitle}
                  >
                    <span className="min-w-0 truncate">{rowTitle}</span>
                  </span>
                  <div className={`${ROW_RIGHT_GRID} min-h-0 items-center`}>
                    <div className="flex min-w-0 justify-end">
                      <div className="relative left-3 flex w-20 items-center justify-center">
                        <span
                          className={`inline-flex max-w-full shrink-0 items-center truncate rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight sm:px-2.5 sm:py-1 sm:text-[11px] client-phase-badge ${phaseBadgeClass}`}
                        >
                          {phaseLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex min-w-0 justify-end">
                      <span className="relative inline-flex max-w-full items-center gap-1 rounded-lg border border-border-subtle bg-surface-card px-2 py-1 text-[10px] font-semibold leading-tight text-content shadow-sm transition group-hover:border-[var(--client-accent)]/40 group-hover:bg-surface-muted sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px]">
                        <span className="truncate">{localizedActionLabel}</span>
                        <FiChevronRight
                          className="shrink-0 text-[14px] text-content-muted transition group-hover:translate-x-0.5 sm:text-[16px]"
                          aria-hidden
                        />
                        {hasTeamResponse ? (
                          <span
                            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--client-accent)] ring-2 ring-surface-card"
                            title={t("historyTable.teamResponseAvailable")}
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Mobile card row */}
                <button
                  type="button"
                  onClick={() => openDetail(row)}
                  aria-label={`${displayTitle}, ${phaseLabel}, ${localizedActionLabel}`}
                  className="client-issue-mobile-card group flex w-full flex-col text-left md:hidden"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none client-phase-badge ${phaseBadgeClass}`}
                    >
                      {phaseLabel}
                    </span>
                    <time
                      dateTime={row.date}
                      className="shrink-0 text-[11px] font-medium text-content-muted"
                    >
                      {row.date}
                    </time>
                  </div>

                  <div className="relative mt-3 min-w-0">
                    <div className="flex items-start gap-2">
                      <p
                        className="line-clamp-2 flex-1 text-[15px] font-semibold leading-snug tracking-tight text-content"
                        title={displayTitle}
                      >
                        {displayTitle}
                      </p>
                      {hasTeamResponse ? (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--client-accent)] ring-2 ring-surface-card"
                          title={t("historyTable.teamResponseAvailable")}
                          aria-label={t("historyTable.teamResponseAvailable")}
                        />
                      ) : null}
                    </div>
                    {showDetailPreview ? (
                      <p
                        className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-content-muted"
                        title={detail}
                      >
                        {detail}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3.5 flex min-h-[44px] items-center justify-between gap-3 border-t border-border-subtle/80 pt-3">
                    <span className="text-[13px] font-medium text-[var(--client-accent)]">
                      {localizedActionLabel}
                    </span>
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-content-muted transition group-hover:bg-[var(--client-accent)]/10 group-hover:text-[var(--client-accent)]"
                      aria-hidden
                    >
                      <FiChevronRight className="text-[17px]" />
                    </span>
                  </div>
                </button>
              </li>
            );
          })
        )}
        </ul>
      </div>

      <IssueDetailModal
        open={detailOpen}
        row={selectedRow}
        onClose={closeDetail}
        onExited={handleDetailExited}
      />
    </motion.article>
  );
}
