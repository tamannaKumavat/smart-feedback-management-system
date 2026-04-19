export const createTicketChatSeed = [
  {
    kind: "date",
    id: "sep-1",
    label: "Fri, 10 Apr 2026",
  },
  {
    kind: "message",
    id: "u-1",
    role: "user",
    author: "You",
    time: "09:08",
    text: "I can’t get into the dashboard since this morning. After SSO login I land on the dashboard URL but I immediately get HTTP 403 and I’m sent back to the login screen. I’m on Chrome and Edge, same behavior in a private window. I attached a HAR export from one attempt.",
    file: "network-trace.har",
  },
  {
    kind: "confirmation",
    id: "c-1",
    role: "assistant",
    author: "Ruag Team",
    time: "09:14",
    intro:
      "Thanks for the detail. Here’s how we understand your request. Please confirm this is correct before we open the ticket.",
    summary:
      "You cannot access the main dashboard after single sign-on: the app returns HTTP 403 and redirects you back to login. The issue started today, reproduces in Chrome and Edge (including private mode), and you’ve provided a network trace for investigation.",
  },
];

export const clientChatDummyData = createTicketChatSeed;
