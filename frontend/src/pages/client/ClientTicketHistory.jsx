import { useEffect, useMemo, useState } from "react";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import TicketHistory from "../../components/dashboard/client/TicketHistory.jsx";
import { listMyTickets } from "../../lib/chatApi.js";
import { showError } from "../../lib/toast.js";

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

/**
 * Adapt a backend ticket payload to the shape the existing
 * ``<TicketHistory />`` component expects:
 *
 *   - ``threads``:        list-pane rows (id, name, subject, snippet…)
 *   - ``messagesByThread``: map of thread.id -> message rows for the
 *                           detail pane
 */
function buildThreadsAndMessages(tickets) {
  const threads = [];
  const messagesByThread = {};

  for (const ticket of tickets) {
    const messages = ticket.messages || [];
    const firstUser = messages.find((m) => m.sender === "user");
    const lastMsg = messages[messages.length - 1];
    const created = ticket.createdAt ? new Date(ticket.createdAt) : null;
    const subject = firstUser?.content
      ? firstUser.content.split("\n")[0].slice(0, 80)
      : "Support ticket";
    const snippet = (lastMsg?.content || ticket.summary || "").slice(0, 140);
    const hasAttachment = messages.some(
      (m) => Array.isArray(m.attachments) && m.attachments.length > 0,
    );

    threads.push({
      id: ticket.id,
      ticketRef: ticket.id.slice(0, 8),
      name: subject,
      subject,
      preview: snippet,
      snippet,
      timeAgo: created ? created.toLocaleDateString() : "",
      date: created ? created.toLocaleString() : "",
      statusLine: `Ticket ${ticket.status} · ${messages.length} message${messages.length === 1 ? "" : "s"}`,
      category: ticket.status,
      unread: 0,
      starred: false,
      hasAttachment,
      conversation: [],
    });

    messagesByThread[ticket.id] = messages.map((m) => {
      const time = m.createdAt
        ? new Date(m.createdAt).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      const outgoing = m.sender === "user";
      const firstAttachment = m.attachments?.[0];
      return {
        id: m.id,
        sender: outgoing ? "You" : "Ruag team",
        outgoing,
        time,
        type: "text",
        body: m.content,
        file: firstAttachment ? firstAttachment.filename : undefined,
      };
    });
  }

  return { threads, messagesByThread };
}

export default function ClientTicketHistory() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await listMyTickets();
        if (!cancelled) setTickets(data.tickets || []);
      } catch (err) {
        if (!cancelled) showError(err, "Could not load tickets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const { threads, messagesByThread } = useMemo(
    () => buildThreadsAndMessages(tickets),
    [tickets],
  );

  return (
    <PortalLayout mode="client">
      <section className="client-card mx-auto flex h-full min-h-0 min-w-0 w-full max-w-[min(100%,1600px)] flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-[13px] text-content-muted">
              Loading tickets…
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-[14px] font-semibold text-content">
                No tickets yet
              </p>
              <p className="max-w-[360px] text-[12px] text-content-muted">
                When you confirm a ticket from a chat, it’ll appear here with
                the full conversation.
              </p>
            </div>
          ) : (
            <TicketHistory
              threads={threads}
              messagesByThread={messagesByThread}
              sortOptions={sortOptions}
            />
          )}
        </div>
      </section>
    </PortalLayout>
  );
}
