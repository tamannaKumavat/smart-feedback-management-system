export const STAT_TITLE_KEY_BY_ID = {
  totalCreated: "stats.totalCreated",
  pending: "stats.inProgress",
  resolved: "stats.resolved",
  drafts: "stats.drafts",
};

export const TABLE_TITLE_ALIASES = {
  "My Tickets": "historyTable.myTickets",
  "My Issues": "historyTable.myIssues",
};

export const TABLE_LABEL_ALIASES = {
  Date: "historyTable.date",
  Title: "historyTable.title",
  Status: "historyTable.status",
  "View history": "historyTable.viewHistory",
  "Search tickets...": "historyTable.searchTickets",
};

export const TIMELINE_DETAIL_ALIASES = {
  "Issue created": "historyTable.timeline.issueCreated",
  "Issue resolved": "historyTable.timeline.issueResolved",
};

export function localizeTableProp(t, value, aliases) {
  if (!value) return value;
  const key = aliases[value];
  return key ? t(key) : value;
}
