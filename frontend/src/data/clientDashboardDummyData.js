/**
 * Dummy data for the client portal dashboard (`ClientDashboard.jsx`).
 * Icon keys map to components in the dashboard page.
 */

export const clientStatCards = [
  {
    id: "totalTickets",
    title: "Total tickets",
    value: "25",
    trend: "+ 10.43%",
    iconKey: "pie",
  },
  {
    id: "resolutionRate",
    title: "Resolution rate",
    value: "74%",
    trend: "+ 3.10%",
    iconKey: "check",
  },
  {
    id: "avgResponse",
    title: "Average response time",
    value: "4.2h",
    trend: "- 2.43%",
    iconKey: "clock",
  },
  {
    id: "activeTickets",
    title: "Active tickets",
    value: "18",
    trend: "+ 5.34%",
    iconKey: "users",
  },
];

export const clientFeedbackTable = {
  title: "Tickets",
  rows: [
    {
      date: "06 Apr 2026",
      ticket: "Login issue after password reset",
      status: "In Review",
      statusClass: "bg-[#FFF7D6] text-[#92400E]",
    },
    {
      date: "04 Apr 2026",
      ticket: "Search filters reset unexpectedly",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
    },
    {
      date: "02 Apr 2026",
      ticket: "Export PDF formatting overlap",
      status: "Resolved",
      statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
    },
    {
      date: "29 Mar 2026",
      ticket: "Notification frequency too high",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
    },
  ],
};

/** Legend + donut must stay in sync (cumulative % in conic-gradient). */
export const clientFeedbackStatus = {
  total: 299,
  legend: [
    { label: "In Progress", pct: "60.4%", dot: "bg-[#1D79E8]" },
    { label: "Resolved", pct: "25.6%", dot: "bg-[#22DFA2]" },
    { label: "Unassigned", pct: "15%", dot: "bg-[#FF8A00]" },
  ],
  donutConicGradient:
    "conic-gradient(from -90deg, #1D79E8 0% 60.4%, #22DFA2 60.4% 86%, #FF8A00 86% 100%)",
};

export const clientKpiGraph = {
  title: "KPI Performance",
  /** 12 monthly bar heights (matches `KpiGraph` default length). */
  data: [30, 34, 38, 36, 40, 42, 45, 65, 55, 85, 70, 90],
};

export const clientResolvedTasks = {
  title: "Resolved tasks",
  items: [
    { id: "rt-1", label: "Password reset flow updated", meta: "2h ago" },
    { id: "rt-2", label: "CSV export column mapping", meta: "Yesterday" },
    { id: "rt-3", label: "Notification batching", meta: "3d ago" },
  ],
};

/* ——— Used on other client flows (e.g. create feedback) ——— */

export const featureOptions = [
  "Integration options and tools",
  "The advanced search functionality",
  "The customizable settings",
];

export const feedbackHistoryDummy = [
  {
    id: "FB-1001",
    title: "Search results are sometimes slow",
    status: "pending",
    createdAt: "2026-03-30",
  },
  {
    id: "FB-1002",
    title: "Loved the new dashboard filtering",
    status: "resolved",
    createdAt: "2026-03-28",
  },
  {
    id: "FB-1003",
    title: "Please add CSV export for reports",
    status: "in_review",
    createdAt: "2026-03-25",
  },
  {
    id: "FB-1004",
    title: "Notification emails arrive too frequently",
    status: "open",
    createdAt: "2026-03-22",
  },
];
