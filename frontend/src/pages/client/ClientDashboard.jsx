import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import ClientStats from "../../components/dashboard/client/ClientStats.jsx";
import ProjectHistoryTable from "../../components/dashboard/client/ProjectHistoryTable.jsx";
import ProjectHistoryTableSkeleton from "../../components/dashboard/client/ProjectHistoryTableSkeleton.jsx";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import { listMyIssues } from "../../lib/chatApi.js";
import { fadeInUp } from "../../lib/motion.js";
import { showError } from "../../lib/toast.js";

function mapTicketStatusToPhase(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "closed") return "resolved";
  if (normalized === "active") return "inProgress";
  if (normalized === "draft") return "created";
  // waiting_confirmation and any future states.
  return "classified";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function issueDescription(issue) {
  const firstMessage = String(issue.firstMessage ?? "").trim();
  if (firstMessage) return firstMessage;
  return String(issue.summary ?? "").trim();
}

function issueRowTitle(issue) {
  const text =
    String(issue.firstMessage ?? "").trim()
    || issueDescription(issue)
    || String(issue.displaySummary ?? "").trim();
  if (!text) return "Issue";
  return text.split("\n")[0].slice(0, 120);
}

export default function ClientDashboard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await listMyIssues();
        if (!cancelled) setIssues(data.issues || []);
      } catch (err) {
        if (!cancelled) showError(err, "Could not load issue data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = issues.length;
    const inProgress = issues.filter(
      (i) => String(i.status || "").toLowerCase() === "active",
    ).length;
    const resolved = issues.filter(
      (i) => String(i.status || "").toLowerCase() === "closed",
    ).length;
    const drafts = issues.filter(
      (i) => String(i.status || "").toLowerCase() === "draft",
    ).length;
    return [
      {
        id: "totalCreated",
        title: "Total issues",
        value: String(total),
        iconKey: "clipboard",
      },
      {
        id: "pending",
        title: "In progress",
        value: String(inProgress),
        iconKey: "clock",
        percentOfTotal: total ? Math.round((inProgress / total) * 100) : 0,
      },
      {
        id: "resolved",
        title: "Resolved",
        value: String(resolved),
        iconKey: "checkCircle",
        percentOfTotal: total ? Math.round((resolved / total) * 100) : 0,
      },
      {
        id: "drafts",
        title: "Draft count",
        value: String(drafts),
        iconKey: "fileText",
        percentOfTotal: total ? Math.round((drafts / total) * 100) : 0,
      },
    ];
  }, [issues]);

  const rows = useMemo(
    () =>
      issues.map((issue) => ({
        id: issue.id,
        date: formatDate(issue.createdAt),
        ticket: issueRowTitle(issue),
        description: issueDescription(issue) || issueRowTitle(issue),
        response: issue.response,
        responseComments: issue.responseComments,
        resolvedBy: issue.resolvedBy,
        timelinePhase: mapTicketStatusToPhase(issue.status),
        timeline: {
          created: {
            at: formatDate(issue.createdAt),
            detail: "Issue created",
          },
          classified:
            ["active", "closed"].includes(
              String(issue.status || "").toLowerCase(),
            )
              ? { detail: "Issue classified" }
              : null,
          inProgress:
            String(issue.status || "").toLowerCase() === "active"
              ? {
                  at: formatDate(issue.updatedAt || issue.createdAt),
                  detail: "Issue in progress",
                }
              : null,
          resolved:
            String(issue.status || "").toLowerCase() === "closed"
              ? {
                  at: formatDate(issue.updatedAt || issue.createdAt),
                  detail: "Issue resolved",
                }
              : null,
        },
      })),
    [issues],
  );

  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-[min(100%,1600px)] flex-col gap-2 overflow-hidden sm:gap-6">
        <ClientStats stats={stats} />

        <div className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:mt-0">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="issues-skeleton"
                className="flex min-h-0 min-w-0 flex-1 flex-col"
                initial={fadeInUp.initial}
                animate={fadeInUp.animate}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <ProjectHistoryTableSkeleton title="My Issues" />
              </motion.div>
            ) : (
              <motion.div
                key="issues-table"
                className="flex min-h-0 min-w-0 flex-1 flex-col"
                initial={fadeInUp.initial}
                animate={fadeInUp.animate}
                transition={fadeInUp.transition}
              >
                <ProjectHistoryTable title="My Issues" rows={rows} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </PortalLayout>
  );
}
