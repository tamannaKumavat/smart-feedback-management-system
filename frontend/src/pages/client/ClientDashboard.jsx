import { FiCheckSquare, FiClock, FiPieChart, FiUsers } from "react-icons/fi";
import KpiGraph from "../../components/dashboard/client/KpiGraph.jsx";
import ProjectHistoryTable from "../../components/dashboard/client/ProjectHistoryTable.jsx";
import ProjectStatus from "../../components/dashboard/client/ProjectStatus.jsx";
import ResolvedTasks from "../../components/dashboard/client/ResolvedTasks.jsx";
import StatCard from "../../components/dashboard/client/StatCard.jsx";
import {
  clientFeedbackStatus,
  clientFeedbackTable,
  clientKpiGraph,
  clientResolvedTasks,
  clientStatCards,
} from "../../data/clientDashboardDummyData.js";
import PortalLayout from "../../layouts/PortalLayout.jsx";

const STAT_ICONS = {
  pie: FiPieChart,
  check: FiCheckSquare,
  clock: FiClock,
  users: FiUsers,
};

export default function ClientDashboard() {
  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex w-full max-w-[min(100%,1600px)] flex-col gap-4 overflow-x-hidden max-lg:min-h-0 lg:h-[calc(100dvh-7.5rem)] lg:max-h-[calc(100dvh-7.5rem)] lg:min-h-0 lg:overflow-hidden">
        <div className="grid w-full shrink-0 grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {clientStatCards.map((card) => {
            const Icon = STAT_ICONS[card.iconKey] ?? FiPieChart;
            return (
              <StatCard
                key={card.id}
                title={card.title}
                value={card.value}
                trend={card.trend}
                icon={Icon}
              />
            );
          })}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="grid min-h-0 flex-1 basis-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
            <div className="min-h-0 lg:col-span-8">
              <ProjectHistoryTable
                title={clientFeedbackTable.title}
                rows={clientFeedbackTable.rows}
              />
            </div>
            <div className="min-h-0 lg:col-span-4">
              <ProjectStatus
                legend={clientFeedbackStatus.legend}
                total={clientFeedbackStatus.total}
                donutBackground={clientFeedbackStatus.donutConicGradient}
              />
            </div>
          </div>
          <div className="grid min-h-0 flex-1 basis-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
            <div className="min-h-0 lg:col-span-8">
              <KpiGraph
                title={clientKpiGraph.title}
                data={clientKpiGraph.data}
              />
            </div>
            <div className="min-h-0 lg:col-span-4">
              <ResolvedTasks
                title={clientResolvedTasks.title}
                items={clientResolvedTasks.items}
              />
            </div>
          </div>
        </div>
      </section>
    </PortalLayout>
  );
}
