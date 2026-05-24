import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "../../../lib/motion.js";

const ROW_DATE_W = "w-[5.75rem] shrink-0 sm:w-32";
const ROW_RIGHT_GRID =
  "grid min-h-0 min-w-0 max-w-full flex-[0_1_20rem] grid-cols-2 gap-x-2 [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)] sm:max-w-[20rem] sm:gap-x-4";

const SKELETON_ROWS = 7;

/** Title bar width varies per row so the list feels less mechanical. */
const TITLE_WIDTHS = ["72%", "58%", "84%", "65%", "78%", "52%", "70%"];

function SkeletonBar({ className = "", style }) {
  return (
    <div
      className={`client-skeleton ${className}`}
      style={style}
      aria-hidden
    />
  );
}

function SkeletonRow({ index }) {
  const titleWidth = TITLE_WIDTHS[index % TITLE_WIDTHS.length];

  return (
    <motion.div
      variants={staggerItem}
      className="bg-surface-card"
      aria-hidden
    >
      <div className="hidden w-full min-w-0 items-center gap-2 px-3 py-4 md:flex sm:gap-4 sm:px-4 sm:py-4">
        <SkeletonBar className={`${ROW_DATE_W} h-4 rounded-md`} />
        <div className="flex min-w-0 flex-1 items-center">
          <SkeletonBar
            className="h-4 max-w-full rounded-md"
            style={{ width: titleWidth }}
          />
        </div>
        <div className={`${ROW_RIGHT_GRID} items-center`}>
          <div className="flex justify-end">
            <SkeletonBar className="h-6 w-[4.5rem] rounded-full" />
          </div>
          <div className="flex justify-end">
            <SkeletonBar className="h-8 w-[5.5rem] rounded-lg" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-card p-4 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBar className="h-5 w-16 rounded-full" />
          <SkeletonBar className="h-3 w-20 rounded-md" />
        </div>
        <div className="space-y-2">
          <SkeletonBar className="h-[15px] max-w-full rounded-md" style={{ width: titleWidth }} />
          <SkeletonBar className="h-3 w-[62%] rounded-md" />
        </div>
        <div className="flex min-h-[44px] items-center justify-between border-t border-border-subtle/80 pt-3">
          <SkeletonBar className="h-3 w-20 rounded-md" />
          <SkeletonBar className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
}

export default function ProjectHistoryTableSkeleton({
  title = "My Tickets",
  dateLabel = "Date",
  feedbackLabel = "Title",
  statusLabel = "Status",
  actionLabel = "View details",
}) {
  return (
    <article
      className="client-issues-panel relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden md:client-card"
      aria-busy="true"
      aria-label="Loading issues"
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-0.5 origin-left bg-[var(--client-accent)]"
        initial={{ scaleX: 0, opacity: 0.6 }}
        animate={{ scaleX: [0, 0.55, 0.35, 0.85, 0], opacity: [0.5, 1, 1, 1, 0.4] }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: [0.45, 0, 0.55, 1],
        }}
        aria-hidden
      />

      {title ? (
        <div className="client-separator flex min-w-0 shrink-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5">
          <SkeletonBar className="h-5 w-28 rounded-md sm:w-32" />
          <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-[min(100%,32rem)] sm:flex-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <SkeletonBar className="h-10 w-full rounded-xl" />
            <SkeletonBar className="h-10 w-full rounded-lg sm:min-w-[9.5rem]" />
          </div>
        </div>
      ) : null}

      <div className="client-separator hidden min-w-0 shrink-0 items-center gap-2 bg-surface-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-content-muted/70 md:flex sm:gap-4 sm:px-4 sm:py-2.5 sm:text-[12px]">
        <span className={`${ROW_DATE_W} flex min-h-[1.25rem] items-center`}>
          {dateLabel}
        </span>
        <span className="min-h-[1.25rem] min-w-0 flex-1">{feedbackLabel}</span>
        <div className={`${ROW_RIGHT_GRID} min-h-[1.25rem] items-center`}>
          <span className="flex justify-end text-right">{statusLabel}</span>
          <span className="flex justify-end text-right">{actionLabel}</span>
        </div>
      </div>

      <motion.div
        className="client-issues-mobile-list min-h-0 flex-1 overflow-hidden px-0.5 pb-4 pt-4 md:p-0 md:pt-0"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <div className="flex flex-col gap-3 md:gap-0 md:divide-y md:divide-border-subtle client-divide">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <SkeletonRow key={index} index={index} />
        ))}
        </div>
      </motion.div>

      <p className="sr-only">Loading issues…</p>
    </article>
  );
}
