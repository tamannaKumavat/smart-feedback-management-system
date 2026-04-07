import { TICKET_STATUS_CHART } from "../constants/ticketStatusTheme.js";

export const adminDashboardData = {
  summaryCards: [
    {
      id: "totalTickets",
      change: "+14.5%",
      title: "Total Tickets",
      value: 237,
      trend: [45, 48, 52, 42, 57, 46],
    },
    {
      id: "openMine",
      change: "-08.7%",
      title: "Total Mine",
      value: 162,
      trend: [55, 54, 53, 40, 58, 42],
    },
  ],
  hero: {
    title: "Congratulations Henry Ryan!",
    subtitle: "Best Agent of the Week",
    resolved: 185,
    hours: "26 h",
    minutes: "12 m",
  },
  /** Shown in the center of the status donut */
  statusGrandTotal: 299,
  activeTickets: [
    {
      id: "TKT-1005",
      date: "7 Apr 2022",
      description: "Export CSV fails on large date ranges",
      team: "Payments",
      status: "resolved",
    },
    {
      id: "TKT-1006",
      date: "6 Apr 2022",
      description: "Password reset email delayed",
      team: "Support",
      status: "unassigned",
    },
    {
      id: "TKT-1007",
      date: "5 Apr 2022",
      description: "Mobile app crash on checkout screen",
      team: "Marketing",
      status: "pending",
    },
    {
      id: "TKT-1008",
      date: "4 Apr 2022",
      description: "API rate limit too aggressive for partners",
      team: "Security",
      status: "resolved",
    },
    {
      id: "TKT-1009",
      date: "3 Apr 2022",
      description: "Dashboard chart legend overlaps on tablet",
      team: "Support",
      status: "pending",
    },
    {
      id: "TKT-1010",
      date: "2 Apr 2022",
      description: "Webhook retries not surfacing in activity log",
      team: "Payments",
      status: "unassigned",
    },
  ],
  /** Donut + legend: same colors as ActiveTicketsCard header ● summary */
  statusBreakdown: [
    {
      label: "Pending",
      value: 40,
      color: TICKET_STATUS_CHART.pending,
      labelColor: TICKET_STATUS_CHART.pending,
    },
    {
      label: "Unassigned",
      value: 30,
      color: TICKET_STATUS_CHART.unassigned,
      labelColor: TICKET_STATUS_CHART.unassigned,
    },
    {
      label: "Resolved",
      value: 30,
      color: TICKET_STATUS_CHART.resolved,
      labelColor: TICKET_STATUS_CHART.resolved,
    },
  ],
  /** Soft washed gradients (avoid harsh solid mint / blue) */
  performanceCards: [
    {
      id: "avgResolve",
      title: "Average Time to Resolve",
      value: "30 Hours",
      subtitle: "This Week",
      bgFrom: "#F4FDF8",
      bgTo: "#CFF7E6",
    },
    {
      id: "avgResponse",
      title: "Average Response Speed",
      value: "26 Mins",
      subtitle: "This Week",
      bgFrom: "#FAFCFF",
      bgTo: "#D8E8FD",
    },
  ],
  satisfaction: {
    totalReceived: 753,
    greatPercent: 89,
    breakdown: [
      { label: "Happy", value: 96, color: "#60A5FA" },
      { label: "Good", value: 92, color: "#FCD34D" },
      { label: "Sad", value: 6, color: "#CBD5E1" },
    ],
  },
  /** Bars + %: same chart colors as header ● summary */
  solvedTicketsByDepartment: [
    {
      id: "product",
      name: "Product team",
      solvedPct: 68,
      barColor: TICKET_STATUS_CHART.pending,
      track: "#F1F5F9",
      labelColor: TICKET_STATUS_CHART.pending,
    },
    {
      id: "engineering",
      name: "Engineering",
      solvedPct: 72,
      barColor: TICKET_STATUS_CHART.unassigned,
      track: "#F1F5F9",
      labelColor: TICKET_STATUS_CHART.unassigned,
    },
    {
      id: "support",
      name: "Support",
      solvedPct: 61,
      barColor: TICKET_STATUS_CHART.resolved,
      track: "#F1F5F9",
      labelColor: TICKET_STATUS_CHART.resolved,
    },
    {
      id: "marketing",
      name: "Marketing",
      solvedPct: 55,
      barColor: TICKET_STATUS_CHART.pending,
      track: "#F1F5F9",
      labelColor: TICKET_STATUS_CHART.pending,
    },
    {
      id: "security",
      name: "Security",
      solvedPct: 59,
      barColor: TICKET_STATUS_CHART.unassigned,
      track: "#F1F5F9",
      labelColor: TICKET_STATUS_CHART.unassigned,
    },
  ],
  departments: [
    { name: "Payments", value: 74, color: "#60A5FA" },
    { name: "Marketing", value: 62, color: "#34D399" },
    { name: "Support", value: 53, color: "#A78BFA" },
    { name: "Security", value: 34, color: "#F472B6" },
  ],
};
