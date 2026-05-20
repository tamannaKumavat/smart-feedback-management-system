import { useMemo, useState } from "react";
import { FiDownload, FiPlus, FiSearch } from "react-icons/fi";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import {
  adminCustomers,
  adminCustomersStats,
} from "../../data/adminAuxDummyData.js";

const PLAN_FILTERS = [
  { value: "all", label: "All plans" },
  { value: "Enterprise", label: "Enterprise" },
  { value: "Business", label: "Business" },
  { value: "Standard", label: "Standard" },
];

const STATUS_BADGE = {
  active: { label: "Active", className: "admin-badge--success" },
  at_risk: { label: "At risk", className: "admin-badge--warning" },
  inactive: { label: "Inactive", className: "admin-badge--neutral" },
};

function StatusBadge({ status }) {
  const meta = STATUS_BADGE[status] ?? STATUS_BADGE.inactive;
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

export default function AdminCustomers() {
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return adminCustomers.filter((c) => {
      const matchesQuery =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);
      const matchesPlan = planFilter === "all" || c.plan === planFilter;
      return matchesQuery && matchesPlan;
    });
  }, [query, planFilter]);

  return (
    <PortalLayout mode="admin">
      <section className="mx-auto flex w-full max-w-[min(100%,1600px)] flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="admin-page-title">Customers</h1>
            <p className="admin-page-subtitle">
              Accounts using the Smart Feedback System across the organization.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border-input bg-white px-4 py-2 text-[13px] font-medium text-content shadow-sm transition hover:bg-surface-muted"
            >
              <FiDownload size={14} />
              Export CSV
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-[#0F172A] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <FiPlus size={14} />
              Invite customer
            </button>
          </div>
        </header>

        <div className="grid w-full grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {adminCustomersStats.map((stat) => (
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
                placeholder="Search by name, company, email or ID..."
                className="h-full w-full bg-transparent text-[13px] text-content placeholder:text-content-muted focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {PLAN_FILTERS.map((opt) => {
                const active = planFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPlanFilter(opt.value)}
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
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Open tickets</th>
                    <th className="px-4 py-3 text-right">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filtered.map((customer) => (
                    <tr key={customer.id} className="admin-row-hover bg-white">
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-[12px] font-semibold text-[#0F172A]">
                            {customer.fullName
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((p) => p[0]?.toUpperCase() || "")
                              .join("")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#0F172A]">
                              {customer.fullName}
                            </p>
                            <p className="truncate text-[11px] text-content-muted sm:text-[12px]">
                              {customer.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-[#334155]">
                        {customer.company}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="admin-badge admin-badge--info">
                          {customer.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <StatusBadge status={customer.status} />
                      </td>
                      <td className="px-4 py-3 text-right align-middle font-semibold tabular-nums text-[#0F172A]">
                        {customer.openTickets}
                      </td>
                      <td className="px-4 py-3 text-right align-middle text-content-muted">
                        {customer.lastActivity}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-[13px] text-content-muted"
                      >
                        No customers match the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-content-muted sm:text-[12px]">
            Showing {filtered.length} of {adminCustomers.length} customers.
          </p>
        </div>
      </section>
    </PortalLayout>
  );
}
