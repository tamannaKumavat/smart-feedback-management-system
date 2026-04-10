import TicketHistory from "../../components/dashboard/client/TicketHistory.jsx";
import {
  ticketHistorySortOptions,
  ticketHistoryThreads,
} from "../../data/clientTicketHistoryDummy.jsx";
import PortalLayout from "../../layouts/PortalLayout.jsx";

export default function ClientTicketHistory() {
  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] min-h-0 min-w-0 w-full max-w-[min(100%,1600px)] flex-col overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TicketHistory
            threads={ticketHistoryThreads}
            sortOptions={ticketHistorySortOptions}
          />
        </div>
      </section>
    </PortalLayout>
  );
}
