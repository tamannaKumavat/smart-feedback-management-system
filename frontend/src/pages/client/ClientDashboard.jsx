import { useEffect, useMemo, useState } from "react";
import ClientStats from "../../components/dashboard/client/ClientStats.jsx";
import ProjectHistoryTable from "../../components/dashboard/client/ProjectHistoryTable.jsx";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import { listMyIssues } from "../../lib/chatApi.js";
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
    const avgResponse = "N/A";
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
        id: "avgResponse",
        title: "Average response time",
        value: avgResponse,
        iconKey: "zap",
      },
    ];
  }, [issues]);

  const rows = useMemo(
    () =>
      issues.map((issue) => ({
        id: issue.id,
        date: formatDate(issue.createdAt),
        ticket: issue.summary || "Issue",
        timelinePhase: mapTicketStatusToPhase(issue.status),
        timeline: {
          created: {
            at: formatDate(issue.createdAt),
            detail: "Issue created",
          },
          classified: null,
          inProgress: null,
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
      <section className="mx-auto flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] min-h-0 min-w-0 w-full max-w-[min(100%,1600px)] flex-col gap-6 overflow-hidden">
        <ClientStats stats={stats} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-[13px] text-slate-500">
              Loading issues...
            </div>
          ) : (
            <ProjectHistoryTable title="My Issues" rows={rows} />
          )}
        </div>
      </section>
    </PortalLayout>
  );
}
