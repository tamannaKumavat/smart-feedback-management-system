import ClientStats from "../../components/dashboard/client/ClientStats.jsx";
import KpiGraph from "../../components/dashboard/client/KpiGraph.jsx";
import ProjectHistoryTable from "../../components/dashboard/client/ProjectHistoryTable.jsx";
import ProjectStatus from "../../components/dashboard/client/ProjectStatus.jsx";
import ResolvedTasks from "../../components/dashboard/client/ResolvedTasks.jsx";
import {
  clientDashboardTicketStats,
  clientFeedbackTable,
  clientLastUpdates,
  clientKpiGraph,
  clientResolvedTasks,
} from "../../data/clientDashboardDummyData.js";
import PortalLayout from "../../layouts/PortalLayout.jsx";

export default function ClientDashboard() {
  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex w-full max-w-[min(100%,1600px)] flex-col gap-4 overflow-x-hidden max-lg:min-h-0 lg:h-[calc(100dvh-7.5rem)] lg:max-h-[calc(100dvh-7.5rem)] lg:min-h-0 lg:overflow-hidden">
        <ClientStats stats={clientDashboardTicketStats} />

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <ProjectHistoryTable
            title={clientFeedbackTable.title}
            rows={clientFeedbackTable.rows}
          />

          {/* <div className="min-h-0 lg:col-span-4">
              <ProjectStatus title={clientLastUpdates.title} groups={clientLastUpdates.groups} />
            </div> */}
        </div>
      </section>
    </PortalLayout>
  );
}
