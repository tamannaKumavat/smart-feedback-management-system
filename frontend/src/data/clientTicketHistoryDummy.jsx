export const ticketHistorySortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "unread", label: "Unread first" },
];

export const confirmationFollowUp = {
  yes: {
    userContent: "Yes",
    supportContent:
      "Thank you for confirming. Your ticket is now in progress. You can follow the status on your dashboard.",
  },
  no: {
    userContent: "No",
    supportContent:
      "No problem. Please reply with what we should change in the summary, and we’ll update the ticket before moving forward.",
  },
};

export const ticketHistoryThreads = [
  {
    id: "th-1",
    ticketRef: "TKT-2401",
    category: "Access & login",
    name: "TKT-2401",
    subject: "Access & login",
    date: "2026-04-10",
    timeAgo: "25m ago",
    preview:
      "I can’t get into the dashboard. I keep getting a 403 error after I sign in with company SSO.",
    snippet:
      "Support summarized your login issue and asked you to confirm before opening the ticket.",
    channel: "email",
    unread: 1,
    starred: true,
    hasAttachment: true,
    conversation: [
      {
        sender: "user",
        content:
          "I can’t get into the dashboard since this morning. After SSO login I land on the dashboard URL but I immediately get HTTP 403 and I’m sent back to the login screen. I’m on Chrome and Edge, same behavior in a private window. I attached a HAR export from one attempt.",
        file: "/uploads/network-trace.har",
      },
      {
        sender: "Ruag team",
        content:
          "Thanks for the detail. Here’s how we understand your request. Please confirm this is correct before we open the ticket.",
        confirmationRequest: {
          summary:
            "You cannot access the main dashboard after single sign-on: the app returns HTTP 403 and redirects you back to login. The issue started today, reproduces in Chrome and Edgea, and you’ve provided a network trace for investigation.",
        },
      },
    ],
  },
  {
    id: "th-2",
    ticketRef: "TKT-2398",
    category: "Billing",
    name: "TKT-2398",
    subject: "Billing",
    date: "2026-04-09",
    timeAgo: "3h ago",
    preview:
      "Our last invoice PDF is missing the suite number even though it shows correctly in account settings.",
    snippet:
      "Our last invoice PDF is missing the suite number even though it shows correctly in account settings.",
    channel: "email",
    statusLine: "Support replied · waiting on your confirmation",
    unread: 0,
    starred: false,
    hasAttachment: false,
    conversation: [
      {
        sender: "user",
        content:
          "Our last invoice PDF is missing the suite number even though it shows correctly in account settings. Finance is blocking payment until PDF matches the PO line-for-line.",
      },
      {
        sender: "Ruag team",
        content:
          "Understood. Can you send the invoice number and the exact suite line as it should appear? We’ll verify the template mapping for PDF generation.",
      },
      {
        sender: "user",
        content:
          "Invoice INV-2026-0441. Suite should read “Suite 400” under billing address.",
      },
      {
        sender: "Ruag team",
        content:
          "Logged as template bug FIN-112. Fix targeted for tonight’s deploy; you’ll get a corrected PDF by email when it’s live.",
      },
    ],
  },
  {
    id: "th-3",
    ticketRef: "TKT-2392",
    category: "Exports & reporting",
    name: "TKT-2392",
    subject: "Exports & reporting",
    date: "2026-04-08",
    timeAgo: "Yesterday",
    preview:
      "We need CSV export to include custom fields from org settings — right now those columns are always empty.",
    snippet:
      "We need CSV export to include custom fields from org settings — right now those columns are always empty.",
    channel: "messenger",
    statusLine: "You replied · support reviewing",
    unread: 0,
    starred: false,
    hasAttachment: true,
    conversation: [
      {
        sender: "user",
        content:
          "We need CSV export to include custom fields from org settings — right now those columns are always empty on downloads over ~500 rows.",
        file: "/uploads/sample-export-missing-cols.csv",
      },
      {
        sender: "Ruag team",
        content:
          "Thanks for the sample. Engineering confirms pagination drops custom field hydration past page 1. It’s queued for sprint ending Friday; I’ll post the build number here when it’s ready to test.",
      },
    ],
  },
  {
    id: "th-4",
    ticketRef: "TKT-2385",
    category: "Mobile / UI",
    name: "TKT-2385",
    subject: "Mobile / UI",
    date: "2026-04-07",
    timeAgo: "Apr 7",
    preview:
      "On iPhone SE the ticket list horizontal scroll traps focus and the status chips overflow the viewport.",
    snippet:
      "On iPhone SE the ticket list horizontal scroll traps focus and the status chips overflow the viewport.",
    channel: "whatsapp",
    statusLine: "Closed · fix shipped in 2.4.1",
    unread: 0,
    starred: true,
    hasAttachment: false,
    conversation: [
      {
        sender: "user",
        content:
          "On iPhone SE the ticket list horizontal scroll traps focus and the status chips overflow the viewport. WCAG concern for our audit.",
      },
      {
        sender: "Ruag team",
        content:
          "Reproduced on BrowserStack. CSS fix merged — overflow-x on list container removed, chips wrap. Please verify on 2.4.1 and reopen if anything still feels off.",
      },
      {
        sender: "user",
        content:
          "Confirmed on 2.4.1 — looks good. Thanks for the quick turnaround.",
      },
    ],
  },
  {
    id: "th-5",
    ticketRef: "TKT-2371",
    category: "API & integrations",
    name: "TKT-2371",
    subject: "API & integrations",
    date: "2026-04-05",
    timeAgo: "Apr 5",
    preview:
      "Our integration is hitting 429s during bulk sync even though we stay under the documented per-minute cap.",
    snippet:
      "Our integration is hitting 429s during bulk sync even though we stay under the documented per-minute cap.",
    channel: "email",
    statusLine: "Escalated to engineering",
    unread: 0,
    starred: false,
    hasAttachment: false,
    conversation: [
      {
        sender: "user",
        content:
          "Our integration is hitting 429s during bulk sync even though we stay under the documented per-minute cap. Request IDs: req_a91, req_a92 (same second burst).",
      },
      {
        sender: "Ruag team",
        content:
          "We’re seeing burst traffic inside a single second that trips the per-second guardrail (separate from per-minute docs). I’m escalating to add clearer 429 bodies and a short backoff guide for bulk jobs.",
      },
      {
        sender: "Ruag team",
        content:
          "Update: rate limiter tuned in canary. Please retry with 200ms jitter between requests and tell us if 429s persist after 24h.",
      },
    ],
  },
];

const TIME_STAMPS = [
  "09:08",
  "09:14",
  "09:21",
  "09:35",
  "09:52",
  "10:05",
  "10:18",
];

function formatThreadDateLabel(isoDate) {
  if (!isoDate) return "Conversation";
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getTicketHistoryMessagesForThread(thread) {
  if (!thread?.conversation?.length) return [];

  const sepId = `${thread.id}-sep`;
  const dateLabel = formatThreadDateLabel(thread.date);

  const rows = [
    {
      id: sepId,
      dateLabel,
      isSeparator: true,
    },
  ];

  thread.conversation.forEach((turn, i) => {
    const outgoing = turn.sender === "user";
    const sender = outgoing ? "You" : "Ruag Team";
    const time = TIME_STAMPS[i % TIME_STAMPS.length];
    const id = `${thread.id}-m-${i}`;

    if (turn.property) {
      rows.push({
        id,
        sender,
        outgoing,
        time,
        type: "property",
        body: turn.content || "",
        property: turn.property,
        file: turn.file,
      });
      return;
    }

    if (turn.confirmationRequest?.summary) {
      rows.push({
        id,
        sender,
        outgoing: false,
        time,
        type: "confirmation",
        body: turn.content ?? "",
        summary: turn.confirmationRequest.summary,
        file: turn.file,
      });
      return;
    }

    rows.push({
      id,
      sender,
      outgoing,
      time,
      type: "text",
      body: turn.content ?? "",
      file: turn.file,
    });
  });

  return rows;
}
