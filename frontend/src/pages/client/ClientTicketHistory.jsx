import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n/useTranslation.js";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import TicketHistory from "../../components/dashboard/client/TicketHistory.jsx";
import { listMyTickets } from "../../lib/chatApi.js";
import { showError } from "../../lib/toast.js";

function buildThreadsAndMessages(tickets, t) {
  const threads = [];
  const messagesByThread = {};

  for (const ticket of tickets) {
    const messages = ticket.messages || [];
    const firstUser = messages.find((m) => m.sender === "user");
    const lastMsg = messages[messages.length - 1];
    const created = ticket.createdAt ? new Date(ticket.createdAt) : null;
    const subject = firstUser?.content
      ? firstUser.content.split("\n")[0].slice(0, 80)
      : t("ticketList.supportTicket");
    const snippet = (lastMsg?.content || ticket.summary || "").slice(0, 140);
    const hasAttachment = messages.some(
      (m) => Array.isArray(m.attachments) && m.attachments.length > 0,
    );
    const statusLine =
      messages.length === 1
        ? t("ticketList.statusLineOne", {
            status: ticket.status,
          })
        : t("ticketList.statusLine", {
            status: ticket.status,
            count: messages.length,
          });

    threads.push({
      id: ticket.id,
      ticketRef: ticket.id.slice(0, 8),
      name: subject,
      subject,
      preview: snippet,
      snippet,
      timeAgo: created ? created.toLocaleDateString() : "",
      date: created ? created.toLocaleString() : "",
      statusLine,
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
        sender: outgoing ? t("common.you") : t("common.ruagTeam"),
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
  const { t } = useTranslation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const sortOptions = useMemo(
    () => [
      { value: "newest", label: t("ticketList.newest") },
      { value: "oldest", label: t("ticketList.oldest") },
    ],
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await listMyTickets();
        if (!cancelled) setTickets(data.tickets || []);
      } catch (err) {
        if (!cancelled) showError(err, t("ticketList.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const { threads, messagesByThread } = useMemo(
    () => buildThreadsAndMessages(tickets, t),
    [tickets, t],
  );

  return (
    <PortalLayout mode="client">
      <section className="client-card mx-auto flex h-full min-h-0 min-w-0 w-full max-w-[min(100%,1600px)] flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-[13px] text-content-muted">
              {t("ticketList.loading")}
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-[14px] font-semibold text-content">
                {t("ticketList.emptyTitle")}
              </p>
              <p className="max-w-[360px] text-[12px] text-content-muted">
                {t("ticketList.emptyBody")}
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
