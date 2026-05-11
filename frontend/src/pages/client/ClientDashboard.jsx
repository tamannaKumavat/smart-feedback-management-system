import { useEffect, useMemo, useState } from "react";
import { FiInbox } from "react-icons/fi";
import ClientStats from "../../components/dashboard/client/ClientStats.jsx";
import ProjectHistoryTable from "../../components/dashboard/client/ProjectHistoryTable.jsx";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import { listMyIssues } from "../../lib/chatApi.js";
import { showError } from "../../lib/toast.js";

function mapIssueStatusToPhase(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "closed") return "resolved";
  if (normalized === "active") return "inProgress";
  if (normalized === "draft") return "created";
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
        if (!cancelled) showError(err, "Could not load issues");
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
    const active = issues.filter(
      (i) => String(i.status || "").toLowerCase() === "active",
    ).length;
    const closed = issues.filter(
      (i) => String(i.status || "").toLowerCase() === "closed",
    ).length;
    const draft = issues.filter(
      (i) => String(i.status || "").toLowerCase() === "draft",
    ).length;
    return [
      {
        id: "total",
        title: "Total issues",
        value: String(total),
        iconKey: "clipboard",
      },
      {
        id: "active",
        title: "Active issues",
        value: String(active),
        iconKey: "clock",
      },
      {
        id: "closed",
        title: "Closed issues",
        value: String(closed),
        iconKey: "checkCircle",
      },
      {
        id: "draft",
        title: "Draft issues",
        value: String(draft),
        iconKey: "zap",
      },
    ];
  }, [issues]);

  const rows = useMemo(
    () =>
      issues.map((issue) => ({
        id: issue.id,
        date: formatDate(issue.createdAt),
        ticket: issue.summary || "Issue without summary",
        timelinePhase: mapIssueStatusToPhase(issue.status),
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
          ) : rows.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FiInbox className="h-5 w-5" />
              </div>
              <p className="text-[15px] font-semibold text-slate-800">
                No issues created yet
              </p>
              <p className="max-w-[420px] text-[13px] text-slate-500">
                Once you start a chat and create an issue, it will appear here
                with its current status and latest update.
              </p>
            </div>
          ) : (
            <ProjectHistoryTable title="My Issues" rows={rows} />
          )}
        </div>
      </section>
    </PortalLayout>
  );
}
