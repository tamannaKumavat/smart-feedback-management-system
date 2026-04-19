import ClientStats from "../../components/dashboard/client/ClientStats.jsx";
import ProjectHistoryTable from "../../components/dashboard/client/ProjectHistoryTable.jsx";
import {
  clientDashboardTicketStats,
  clientFeedbackTable,
} from "../../data/clientDashboardDummyData.js";
import PortalLayout from "../../layouts/PortalLayout.jsx";

export default function ClientDashboard() {
  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] min-h-0 min-w-0 w-full max-w-[min(100%,1600px)] flex-col gap-6 overflow-hidden">
        <ClientStats stats={clientDashboardTicketStats} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ProjectHistoryTable
            title={clientFeedbackTable.title}
            rows={clientFeedbackTable.rows}
          />
        </div>
      </section>
    </PortalLayout>
  );
}
