import { TICKET_STATUS_CHART } from "../constants/ticketStatusTheme.js";

// Demo-mode mock data for the Admin (Organization) dashboard.
//
// Shapes here are intentionally aligned with the response payloads of the
// backend admin endpoints (see backend/routes/admin.py) so that the
// frontend can be flipped from mock to real API with minimal changes.

export const adminDashboardData = {
  summaryCards: [
    {
      id: "totalTickets",
      change: "+14.5%",
      title: "Total Tickets",
      value: 237,
      trend: [45, 48, 52, 42, 57, 46],
    },
  ],

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
  statusBreakdown: [
    {
      label: "In progress",
      value: 40,
      color: TICKET_STATUS_CHART.pending,
      labelColor: TICKET_STATUS_CHART.pending,
    },
    {
      label: "Received",
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
  performanceCards: [
    {
      id: "avgResolve",
      title: "Average Time to Resolve",
      value: "30 Hours",
      subtitle: "This Week",
      bgFrom: "#F4FDF8",
      bgTo: "#CFF7E6",
      change: "-12.4%",
      isImprovement: true,
    },
    {
      id: "avgResponse",
      title: "Average Response Speed",
      value: "26 Mins",
      subtitle: "This Week",
      bgFrom: "#FAFCFF",
      bgTo: "#D8E8FD",
      change: "-8.1%",
      isImprovement: true,
    },
    {
      id: "fcr",
      title: "First Contact Resolution",
      value: "64%",
      subtitle: "This Week",
      bgFrom: "#FFFDF5",
      bgTo: "#FCE8B2",
      change: "+5.3%",
      isImprovement: true,
    },
    {
      id: "escalation",
      title: "Escalation Rate",
      value: "11%",
      subtitle: "This Week",
      bgFrom: "#FFF5F5",
      bgTo: "#FBD5D5",
      change: "-3.2%",
      isImprovement: true,
    },
  ],
  satisfaction: {
    totalReceived: 612,
    greatPercent: 91,
    breakdown: [
      { label: "Happy", value: 64, color: "#34D399" },
      { label: "Good", value: 27, color: "#FBBF24" },
      { label: "Sad", value: 9, color: "#F87171" },
    ],
  },
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
  ticketVolumeOverTime: [
    { week: "W1", incoming: 42, resolved: 35 },
    { week: "W2", incoming: 38, resolved: 36 },
    { week: "W3", incoming: 55, resolved: 44 },
    { week: "W4", incoming: 48, resolved: 46 },
    { week: "W5", incoming: 62, resolved: 50 },
    { week: "W6", incoming: 58, resolved: 55 },
    { week: "W7", incoming: 45, resolved: 43 },
    { week: "W8", incoming: 51, resolved: 49 },
  ],
  teamWorkload: [
    { team: "L1 Support", open: 14, resolved: 32 },
    { team: "L2 Technical", open: 21, resolved: 24 },
    { team: "L3 Engineering", open: 11, resolved: 16 },
    { team: "Product", open: 8, resolved: 12 },
    { team: "Legal", open: 4, resolved: 5 },
  ],
  ticketTypeBreakdown: [
    { type: "Bug", value: 87, color: "#EF4444" },
    { type: "Feature", value: 54, color: "#3B82F6" },
    { type: "Question", value: 43, color: "#A78BFA" },
    { type: "Other", value: 25, color: "#9CA3AF" },
  ],
};
