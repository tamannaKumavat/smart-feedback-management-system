import TicketHistory from "../../components/dashboard/client/ticket-history.jsx";
import {
  ticketHistoryMessagesByThread,
  ticketHistorySortOptions,
  ticketHistoryThreads,
} from "../../data/clientTicketHistoryDummy.jsx";
import PortalLayout from "../../layouts/PortalLayout.jsx";

export default function ClientTicketHistory() {
  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex h-[calc(100dvh-7.5rem)] max-h-[calc(100dvh-7.5rem)] min-h-0 min-w-0 w-full max-w-[min(100%,1600px)] flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TicketHistory
            threads={ticketHistoryThreads}
            messagesByThread={ticketHistoryMessagesByThread}
            sortOptions={ticketHistorySortOptions}
          />
        </div>
      </section>
    </PortalLayout>
  );
}
