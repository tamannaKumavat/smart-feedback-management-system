/**
 * Dummy data for the client portal dashboard (`ClientDashboard.jsx`).
 * `iconKey` values map to icons inside `ClientStats.jsx`.
 */

/** Top row: ticket overview for `ClientStats` (4 columns). */
export const clientDashboardTicketStats = [
  {
    id: "totalCreated",
    title: "Total created tickets",
    value: "48",
    iconKey: "clipboard",
    percentOfTotal: null,
  },
  {
    id: "pending",
    title: "Pending tickets",
    value: "12",
    iconKey: "clock",
    trend: null,
    percentOfTotal: 25,
  },
  {
    id: "resolved",
    title: "Resolved tickets",
    value: "32",
    iconKey: "checkCircle",
    trend: null,
    percentOfTotal: 67,
  },
  {
    id: "avgResponse",
    title: "Average response time",
    value: "4.2h",
    iconKey: "zap",
    percentOfTotal: null,
  },
];

export const clientFeedbackTable = {
  title: "My Tickets",
  rows: [
    {
      id: "tkt-1001",
      date: "06 Apr 2026",
      hasScreenshot: true,
      ticket:
        "Login issue after password reset — users are redirected to an error page when completing the reset link from corporate SSO. Reproduced on Chrome 120 and Safari 17 when 2FA is enabled and the session expires mid-flow; clearing cookies temporarily fixes it but the problem returns after idle timeout.",
      status: "In Review",
      statusClass: "bg-[#FFF7D6] text-[#92400E]",
      timelinePhase: "classified",
      timeline: {
        created: { at: "06 Apr 2026 · 09:12", detail: "Submitted from portal" },
        classified: { at: "06 Apr 2026 · 15:40", detail: "Routed to Identity team" },
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1002",
      date: "04 Apr 2026",
      hasScreenshot: true,
      ticket:
        "Search filters reset unexpectedly whenever the user navigates back from a detail view or opens a second tab to the same list. Saved filter chips disappear and the query string is cleared, which breaks shared bookmarked searches and frustrates power users who rely on complex multi-field filters.",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "04 Apr 2026 · 08:05", detail: "Ticket created" },
        classified: { at: "04 Apr 2026 · 11:22", detail: "Product backlog" },
        inProgress: { at: "05 Apr 2026 · 10:00", detail: "Engineering investigating" },
        resolved: null,
      },
    },
    {
      id: "tkt-1003",
      date: "02 Apr 2026",
      hasScreenshot: true,
      ticket:
        "Export PDF formatting overlap — headers and footers collide with multi-line ticket descriptions and wide tables, especially when exporting more than fifty rows. Customer branding logo also scales incorrectly on A4 vs Letter, and page breaks split rows in the middle of cells.",
      status: "Resolved",
      statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
      timelinePhase: "resolved",
      timeline: {
        created: { at: "02 Apr 2026 · 14:18", detail: "Reported by you" },
        classified: { at: "02 Apr 2026 · 16:02", detail: "Assigned to Reports squad" },
        inProgress: { at: "03 Apr 2026 · 09:30", detail: "Fix verified on staging" },
        resolved: { at: "04 Apr 2026 · 17:45", detail: "Deployed to production" },
      },
    },
    {
      id: "tkt-1004",
      date: "29 Mar 2026",
      ticket:
        "Notification frequency too high — digest emails arrive every few minutes during incidents, overwhelming mobile inboxes. Requesting per-project thresholds, a daily cap option, and smarter batching when multiple tickets change state within the same five-minute window.",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "29 Mar 2026 · 19:55", detail: "Created via email" },
        classified: { at: "30 Mar 2026 · 08:10", detail: "Notifications pod" },
        inProgress: { at: "31 Mar 2026 · 13:20", detail: "Tuning batching rules" },
        resolved: null,
      },
    },
    {
      id: "tkt-1005",
      date: "28 Mar 2026",
      ticket:
        "Billing address typo on invoice — suite number is missing on PDF invoices even though it appears correctly in account settings. Finance needs this corrected before month-end close because vendors reject invoices that do not match purchase orders line-for-line.",
      status: "New",
      statusClass: "bg-[#F3F4F6] text-[#475569]",
      timelinePhase: "created",
      timeline: {
        created: { at: "28 Mar 2026 · 07:40", detail: "Awaiting triage" },
        classified: null,
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1006",
      date: "27 Mar 2026",
      ticket:
        "Session timeout while editing draft — long-form feedback is lost without warning after twenty minutes of idle focus in the rich text area. Autosave appears to run but restoring the draft from the recovery banner shows an older version, causing duplicate submissions from frustrated users.",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "27 Mar 2026 · 10:15", detail: "Portal submission" },
        classified: { at: "27 Mar 2026 · 14:00", detail: "Web app squad" },
        inProgress: { at: "28 Mar 2026 · 09:00", detail: "Reproducing on staging" },
        resolved: null,
      },
    },
    {
      id: "tkt-1007",
      date: "26 Mar 2026",
      ticket:
        "CSV import rejects valid rows — rows containing accented characters or trailing spaces in the email column fail validation with a generic error. The sample template does not document required column order or date formats, and error CSV does not include row numbers for quick fixes.",
      status: "In Review",
      statusClass: "bg-[#FFF7D6] text-[#92400E]",
      timelinePhase: "classified",
      timeline: {
        created: { at: "26 Mar 2026 · 16:22", detail: "Uploaded sample file" },
        classified: { at: "27 Mar 2026 · 08:30", detail: "Data platform" },
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1008",
      date: "25 Mar 2026",
      hasScreenshot: true,
      ticket:
        "Mobile layout breaks on small screens — the ticket list horizontal scroll traps focus and the status chips overflow the viewport on iPhone SE width. Action buttons stack awkwardly over the ticket title, and the keyboard covers the comment field without resizing the viewport.",
      status: "Resolved",
      statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
      timelinePhase: "resolved",
      timeline: {
        created: { at: "25 Mar 2026 · 11:05", detail: "Screenshot attached" },
        classified: { at: "25 Mar 2026 · 15:18", detail: "Frontend guild" },
        inProgress: { at: "26 Mar 2026 · 12:00", detail: "CSS fix merged" },
        resolved: { at: "27 Mar 2026 · 18:10", detail: "Released in 2.4.1" },
      },
    },
    {
      id: "tkt-1009",
      date: "24 Mar 2026",
      ticket: "Webhook retries flooding logs",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "24 Mar 2026 · 08:40", detail: "Ops alert" },
        classified: { at: "24 Mar 2026 · 13:00", detail: "Integrations" },
        inProgress: { at: "25 Mar 2026 · 10:30", detail: "Backoff tuning" },
        resolved: null,
      },
    },
    {
      id: "tkt-1010",
      date: "23 Mar 2026",
      ticket: "Role picker empty for guest users",
      status: "New",
      statusClass: "bg-[#F3F4F6] text-[#475569]",
      timelinePhase: "created",
      timeline: {
        created: { at: "23 Mar 2026 · 17:55", detail: "Awaiting triage" },
        classified: null,
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1011",
      date: "22 Mar 2026",
      ticket: "Dashboard widget shows stale counts",
      status: "In Review",
      statusClass: "bg-[#FFF7D6] text-[#92400E]",
      timelinePhase: "classified",
      timeline: {
        created: { at: "22 Mar 2026 · 09:20", detail: "Compared with API" },
        classified: { at: "22 Mar 2026 · 16:45", detail: "Analytics team" },
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1012",
      date: "21 Mar 2026",
      ticket: "2FA backup codes not downloadable",
      status: "Resolved",
      statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
      timelinePhase: "resolved",
      timeline: {
        created: { at: "21 Mar 2026 · 12:10", detail: "Security concern" },
        classified: { at: "21 Mar 2026 · 14:00", detail: "Identity" },
        inProgress: { at: "22 Mar 2026 · 11:00", detail: "PDF generation fix" },
        resolved: { at: "23 Mar 2026 · 09:00", detail: "Verified in prod" },
      },
    },
    {
      id: "tkt-1013",
      date: "20 Mar 2026",
      ticket: "Audit log export missing actor column",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "20 Mar 2026 · 07:30", detail: "Compliance request" },
        classified: { at: "20 Mar 2026 · 11:00", detail: "Platform" },
        inProgress: { at: "21 Mar 2026 · 15:20", detail: "Schema migration" },
        resolved: null,
      },
    },
    {
      id: "tkt-1014",
      date: "19 Mar 2026",
      ticket: "Keyboard trap in modal dialog",
      status: "In Review",
      statusClass: "bg-[#FFF7D6] text-[#92400E]",
      timelinePhase: "classified",
      timeline: {
        created: { at: "19 Mar 2026 · 13:40", detail: "WCAG issue" },
        classified: { at: "20 Mar 2026 · 08:15", detail: "Accessibility" },
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1015",
      date: "18 Mar 2026",
      ticket: "Invoice PDF currency symbol wrong",
      status: "Resolved",
      statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
      timelinePhase: "resolved",
      timeline: {
        created: { at: "18 Mar 2026 · 10:00", detail: "EUR shown as USD" },
        classified: { at: "18 Mar 2026 · 12:30", detail: "Billing" },
        inProgress: { at: "19 Mar 2026 · 09:00", detail: "Locale fix" },
        resolved: { at: "19 Mar 2026 · 16:00", detail: "Hotfix deployed" },
      },
    },
    {
      id: "tkt-1016",
      date: "17 Mar 2026",
      ticket: "Bulk delete confirmation unclear",
      status: "New",
      statusClass: "bg-[#F3F4F6] text-[#475569]",
      timelinePhase: "created",
      timeline: {
        created: { at: "17 Mar 2026 · 15:00", detail: "UX feedback" },
        classified: null,
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1017",
      date: "16 Mar 2026",
      ticket: "GraphQL query timeout on large orgs",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "16 Mar 2026 · 08:55", detail: "500 after 30s" },
        classified: { at: "16 Mar 2026 · 13:20", detail: "API team" },
        inProgress: { at: "17 Mar 2026 · 10:00", detail: "Adding pagination" },
        resolved: null,
      },
    },
    {
      id: "tkt-1018",
      date: "15 Mar 2026",
      ticket: "Email digest links land on 404",
      status: "Resolved",
      statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
      timelinePhase: "resolved",
      timeline: {
        created: { at: "15 Mar 2026 · 06:12", detail: "Marketing flagged" },
        classified: { at: "15 Mar 2026 · 10:00", detail: "Growth" },
        inProgress: { at: "15 Mar 2026 · 14:00", detail: "Route alias added" },
        resolved: { at: "16 Mar 2026 · 08:00", detail: "Verified sends" },
      },
    },
    {
      id: "tkt-1019",
      date: "14 Mar 2026",
      ticket: "Custom fields not searchable",
      status: "In Review",
      statusClass: "bg-[#FFF7D6] text-[#92400E]",
      timelinePhase: "classified",
      timeline: {
        created: { at: "14 Mar 2026 · 11:30", detail: "Feature gap" },
        classified: { at: "15 Mar 2026 · 09:00", detail: "Search infra" },
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1020",
      date: "13 Mar 2026",
      ticket: "Avatar upload fails over slow networks",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "13 Mar 2026 · 14:20", detail: "Timeout error" },
        classified: { at: "14 Mar 2026 · 08:00", detail: "Media pipeline" },
        inProgress: { at: "14 Mar 2026 · 16:00", detail: "Chunked upload" },
        resolved: null,
      },
    },
    {
      id: "tkt-1021",
      date: "12 Mar 2026",
      ticket: "Report schedule skips daylight change",
      status: "New",
      statusClass: "bg-[#F3F4F6] text-[#475569]",
      timelinePhase: "created",
      timeline: {
        created: { at: "12 Mar 2026 · 09:45", detail: "Cron off by one hour" },
        classified: null,
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1022",
      date: "11 Mar 2026",
      ticket: "SSO redirect loop on Safari",
      status: "Resolved",
      statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
      timelinePhase: "resolved",
      timeline: {
        created: { at: "11 Mar 2026 · 10:10", detail: "Enterprise customer" },
        classified: { at: "11 Mar 2026 · 12:00", detail: "Identity" },
        inProgress: { at: "12 Mar 2026 · 09:00", detail: "Cookie SameSite fix" },
        resolved: { at: "13 Mar 2026 · 07:00", detail: "Confirmed by customer" },
      },
    },
    {
      id: "tkt-1023",
      date: "10 Mar 2026",
      ticket: "Tooltip clipped inside scroll region",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "10 Mar 2026 · 13:00", detail: "UI polish" },
        classified: { at: "11 Mar 2026 · 08:30", detail: "Design systems" },
        inProgress: { at: "11 Mar 2026 · 15:00", detail: "Portal layer fix" },
        resolved: null,
      },
    },
    {
      id: "tkt-1024",
      date: "09 Mar 2026",
      ticket: "API key rotation email unclear",
      status: "In Review",
      statusClass: "bg-[#FFF7D6] text-[#92400E]",
      timelinePhase: "classified",
      timeline: {
        created: { at: "09 Mar 2026 · 07:20", detail: "Developer feedback" },
        classified: { at: "09 Mar 2026 · 16:00", detail: "Docs team" },
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1025",
      date: "08 Mar 2026",
      ticket: "Comment mentions not triggering notify",
      status: "Resolved",
      statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
      timelinePhase: "resolved",
      timeline: {
        created: { at: "08 Mar 2026 · 12:45", detail: "Team collaboration" },
        classified: { at: "08 Mar 2026 · 15:00", detail: "Notifications" },
        inProgress: { at: "09 Mar 2026 · 10:00", detail: "Worker job fixed" },
        resolved: { at: "09 Mar 2026 · 17:00", detail: "Regression test OK" },
      },
    },
    {
      id: "tkt-1026",
      date: "07 Mar 2026",
      ticket: "Frozen columns misaligned after resize",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "07 Mar 2026 · 08:50", detail: "Data grid bug" },
        classified: { at: "07 Mar 2026 · 14:00", detail: "Tables squad" },
        inProgress: { at: "08 Mar 2026 · 11:00", detail: "Resize observer" },
        resolved: null,
      },
    },
    {
      id: "tkt-1027",
      date: "06 Mar 2026",
      ticket: "Org logo pixelated on retina",
      status: "New",
      statusClass: "bg-[#F3F4F6] text-[#475569]",
      timelinePhase: "created",
      timeline: {
        created: { at: "06 Mar 2026 · 16:30", detail: "Branding" },
        classified: null,
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1028",
      date: "05 Mar 2026",
      ticket: "SAML attribute mapping for department",
      status: "In Review",
      statusClass: "bg-[#FFF7D6] text-[#92400E]",
      timelinePhase: "classified",
      timeline: {
        created: { at: "05 Mar 2026 · 09:00", detail: "IT request" },
        classified: { at: "06 Mar 2026 · 08:00", detail: "Enterprise SSO" },
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1029",
      date: "04 Mar 2026",
      ticket: "Print stylesheet hides critical fields",
      status: "Resolved",
      statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
      timelinePhase: "resolved",
      timeline: {
        created: { at: "04 Mar 2026 · 11:15", detail: "Customer printout" },
        classified: { at: "04 Mar 2026 · 13:00", detail: "Frontend" },
        inProgress: { at: "05 Mar 2026 · 09:00", detail: "@media print fix" },
        resolved: { at: "05 Mar 2026 · 15:00", detail: "Shipped" },
      },
    },
    {
      id: "tkt-1030",
      date: "03 Mar 2026",
      ticket: "Rate limit headers inconsistent",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "03 Mar 2026 · 07:00", detail: "API consumer" },
        classified: { at: "03 Mar 2026 · 12:00", detail: "Gateway" },
        inProgress: { at: "04 Mar 2026 · 10:00", detail: "Unifying Retry-After" },
        resolved: null,
      },
    },
    {
      id: "tkt-1031",
      date: "02 Mar 2026",
      ticket: "Saved views shared link expires early",
      status: "In Review",
      statusClass: "bg-[#FFF7D6] text-[#92400E]",
      timelinePhase: "classified",
      timeline: {
        created: { at: "02 Mar 2026 · 14:40", detail: "Sharing bug" },
        classified: { at: "03 Mar 2026 · 08:00", detail: "Collaboration" },
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1032",
      date: "01 Mar 2026",
      ticket: "Onboarding checklist progress resets",
      status: "Resolved",
      statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
      timelinePhase: "resolved",
      timeline: {
        created: { at: "01 Mar 2026 · 10:00", detail: "New tenant" },
        classified: { at: "01 Mar 2026 · 12:00", detail: "Growth" },
        inProgress: { at: "02 Mar 2026 · 09:00", detail: "localStorage key" },
        resolved: { at: "02 Mar 2026 · 16:00", detail: "Patch 2.3.8" },
      },
    },
    {
      id: "tkt-1033",
      date: "28 Feb 2026",
      ticket: "Video embed blocked by CSP",
      status: "New",
      statusClass: "bg-[#F3F4F6] text-[#475569]",
      timelinePhase: "created",
      timeline: {
        created: { at: "28 Feb 2026 · 15:20", detail: "Help center" },
        classified: null,
        inProgress: null,
        resolved: null,
      },
    },
    {
      id: "tkt-1034",
      date: "27 Feb 2026",
      ticket: "Batch invite CSV template outdated",
      status: "In Progress",
      statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
      timelinePhase: "inProgress",
      timeline: {
        created: { at: "27 Feb 2026 · 08:30", detail: "HR admin" },
        classified: { at: "27 Feb 2026 · 11:00", detail: "Admin experience" },
        inProgress: { at: "28 Feb 2026 · 10:00", detail: "Docs + sample file" },
        resolved: null,
      },
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

/** Feed for `ProjectStatus.jsx` (Last Updates). `iconKey`: resolved | comment | milestone | assigned | edited | priority */
export const clientLastUpdates = {
  title: "Last Updates",
  groups: [
    {
      id: "today",
      label: "Today",
      items: [
        {
          id: "lu-t1",
          iconKey: "resolved",
          title: "Task moved to Resolved",
          description:
            "Your ticket “Export PDF formatting overlap” was marked resolved after the fix shipped to production. Thanks for the detailed repro steps — they helped the team ship faster.",
          at: "07 Apr 2026 · 10:45 AM",
        },
        {
          id: "lu-t2",
          iconKey: "comment",
          title: "New comment on your ticket",
          description:
            "Support left an update on “Login issue after password reset”: they reproduced the SSO timeout and need one more screen recording from your side when you have a moment.",
          at: "07 Apr 2026 · 8:20 AM",
        },
        {
          id: "lu-t3",
          iconKey: "milestone",
          title: "Milestone completed",
          description:
            "Project “Customer portal Q2” hit the milestone Stabilization — all P1 items from your feedback queue are now closed or in verification. Nice progress.",
          at: "07 Apr 2026 · 7:05 AM",
        },
      ],
    },
    {
      id: "yesterday",
      label: "Yesterday",
      items: [
        {
          id: "lu-y1",
          iconKey: "assigned",
          title: "You were assigned to a task",
          description:
            "You’ve been added as a watcher on “CSV import rejects valid rows” so you’ll get status changes and can upload a sample file if the data team reaches out.",
          at: "06 Apr 2026 · 4:30 PM",
        },
        {
          id: "lu-y2",
          iconKey: "priority",
          title: "Priority updated",
          description:
            "“Webhook retries flooding logs” was escalated to High based on volume in your org. Engineering is actively tuning backoff and log sampling.",
          at: "06 Apr 2026 · 2:15 PM",
        },
        {
          id: "lu-y3",
          iconKey: "edited",
          title: "Ticket description edited",
          description:
            "An agent expanded the description on “Billing address typo on invoice” with finance ticket numbers and a link to the correct PO — no action needed unless details look wrong.",
          at: "06 Apr 2026 · 9:50 AM",
        },
        {
          id: "lu-y4",
          iconKey: "resolved",
          title: "Task moved to Resolved",
          description:
            "“Mobile layout breaks on small screens” is resolved in app release 2.4.1. Update when convenient and let us know if anything still feels off on small devices.",
          at: "06 Apr 2026 · 8:00 AM",
        },
      ],
    },
  ],
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
    status: "in_progress",
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
