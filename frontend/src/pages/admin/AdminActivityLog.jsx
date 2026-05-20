import { useMemo, useState } from "react";
import { FiDownload, FiRefreshCw, FiSearch } from "react-icons/fi";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import {
  adminActivityCategories,
  adminActivityLog,
  adminActivityStats,
} from "../../data/adminAuxDummyData.js";

const SEVERITY_BADGE = {
  info: { label: "Info", className: "admin-badge--info" },
  success: { label: "Success", className: "admin-badge--success" },
  warning: { label: "Warning", className: "admin-badge--warning" },
  danger: { label: "Critical", className: "admin-badge--danger" },
};

function SeverityBadge({ severity }) {
  const meta = SEVERITY_BADGE[severity] ?? SEVERITY_BADGE.info;
  return (
    <span className={`admin-badge ${meta.className}`}>{meta.label}</span>
  );
}

function StatCard({ stat }) {
  const trendIsPositive = String(stat.trend || "").trim().startsWith("+");
  return (
    <article className="admin-card flex min-h-0 min-w-0 flex-col p-3 sm:p-4">
      <p className="text-[12px] font-medium text-content-muted sm:text-[13px]">
        {stat.title}
      </p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-xl font-bold leading-none tracking-tight text-[#0F172A] sm:text-2xl">
          {stat.value}
        </p>
        {stat.trend ? (
          <span
            className={`max-w-[60%] shrink-0 text-right text-[11px] font-semibold leading-snug sm:text-[12px] ${
              trendIsPositive ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {stat.trend}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export default function AdminActivityLog() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return adminActivityLog.filter((event) => {
      const matchesQuery =
        !q ||
        event.actor.toLowerCase().includes(q) ||
        event.action.toLowerCase().includes(q) ||
        event.target.toLowerCase().includes(q) ||
        event.id.toLowerCase().includes(q);
      const matchesCategory = category === "all" || event.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  return (
    <PortalLayout mode="admin">
      <section className="mx-auto flex w-full max-w-[min(100%,1600px)] flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="admin-page-title">Activity Log</h1>
            <p className="admin-page-subtitle">
              Chronological audit trail of customer, agent, and system events.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border-input bg-white px-4 py-2 text-[13px] font-medium text-content shadow-sm transition hover:bg-surface-muted"
            >
              <FiRefreshCw size={14} />
              Refresh
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border-input bg-white px-4 py-2 text-[13px] font-medium text-content shadow-sm transition hover:bg-surface-muted"
            >
              <FiDownload size={14} />
              Export
            </button>
          </div>
        </header>

        <div className="grid w-full grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {adminActivityStats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>

        <div className="admin-card flex flex-col gap-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="admin-search-field min-w-[220px] flex-1">
              <FiSearch className="text-content-muted" size={14} />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by actor, action, target or event ID..."
                className="h-full w-full bg-transparent text-[13px] text-content placeholder:text-content-muted focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {adminActivityCategories.map((opt) => {
                const active = category === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                      active
                        ? "bg-[#0F172A] text-white shadow-sm"
                        : "border border-border-input bg-white text-content hover:bg-surface-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="admin-table-shell">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] border-collapse text-left text-[12px] sm:text-[13px]">
                <thead className="bg-[#FAFBFC] text-[11px] font-semibold uppercase tracking-wide text-[#64748B] sm:text-[12px]">
                  <tr>
                    <th className="px-4 py-3">Time (UTC)</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filtered.map((event) => (
                    <tr key={event.id} className="admin-row-hover bg-white">
                      <td className="px-4 py-3 align-middle whitespace-nowrap tabular-nums text-content-muted">
                        {event.timestamp}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <p className="font-semibold text-[#0F172A]">
                          {event.actor}
                        </p>
                        <p className="text-[11px] text-content-muted sm:text-[12px]">
                          {event.actorRole}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-middle text-[#334155]">
                        {event.action}
                      </td>
                      <td className="px-4 py-3 align-middle text-[#475569]">
                        {event.target}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <SeverityBadge severity={event.severity} />
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-[13px] text-content-muted"
                      >
                        No events match the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-content-muted sm:text-[12px]">
            Showing {filtered.length} of {adminActivityLog.length} events.
          </p>
        </div>
      </section>
    </PortalLayout>
  );
}
