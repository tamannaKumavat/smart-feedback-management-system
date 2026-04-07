import { FiCheckSquare, FiClock, FiPieChart, FiUsers } from "react-icons/fi";
import KpiGraph from "../../components/dashboard/client/KpiGraph.jsx";
import ProjectHistoryTable from "../../components/dashboard/client/ProjectHistoryTable.jsx";
import ProjectStatus from "../../components/dashboard/client/ProjectStatus.jsx";
import ResolvedTasks from "../../components/dashboard/client/ResolvedTasks.jsx";
import StatCard from "../../components/StatCard.jsx";
import PortalLayout from "../../layouts/PortalLayout.jsx";

const statCards = [
  {
    title: "Total feedback",
    value: "25",
    trend: "+ 10.43%",
    icon: FiPieChart,
  },
  {
    title: "Resolution rate",
    value: "74%",
    trend: "+ 3.10%",
    icon: FiCheckSquare,
  },
  {
    title: "Average response time",
    value: "4.2h",
    trend: "- 2.43%",
    icon: FiClock,
  },
  {
    title: "Active tickets",
    value: "18",
    trend: "+ 5.34%",
    icon: FiUsers,
  },
];

const projectStatusLegend = [
  { label: "In Progress", pct: "60.4%", dot: "bg-[#1D79E8]" },
  { label: "Resolved", pct: "25.6%", dot: "bg-[#22DFA2]" },
  { label: "Unassigned", pct: "15%", dot: "bg-[#FF8A00]" },
];

const feedbackRows = [
  {
    date: "06 Apr 2026",
    feedback: "Login issue after password reset",
    status: "In Review",
    statusClass: "bg-[#FFF7D6] text-[#92400E]",
  },
  {
    date: "04 Apr 2026",
    feedback: "Search filters reset unexpectedly",
    status: "In Progress",
    statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
  },
  {
    date: "02 Apr 2026",
    feedback: "Export PDF formatting overlap",
    status: "Resolved",
    statusClass: "bg-[#DFF5E8] text-[#2E7D32]",
  },
  {
    date: "29 Mar 2026",
    feedback: "Notification frequency too high",
    status: "In Progress",
    statusClass: "bg-[#E3F0FF] text-[#1E3A8A]",
  },
];

export default function ClientDashboard() {
  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex w-full max-w-[min(100%,1600px)] flex-col gap-1.5 overflow-x-hidden max-lg:min-h-0 lg:h-[calc(100dvh-7.5rem)] lg:max-h-[calc(100dvh-7.5rem)] lg:min-h-0 lg:overflow-hidden">
        <div className="grid w-full shrink-0 grid-cols-1 gap-1.5 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              trend={card.trend}
              icon={card.icon}
            />
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <div className="grid min-h-0 flex-1 basis-0 grid-cols-1 gap-1.5 lg:grid-cols-12 lg:items-stretch">
            <div className="min-h-0 lg:col-span-8">
              <ProjectHistoryTable title="Feedbacks" rows={feedbackRows} />
            </div>
            <div className="min-h-0 lg:col-span-4">
              <ProjectStatus legend={projectStatusLegend} total={299} />
            </div>
          </div>
          <div className="grid min-h-0 flex-1 basis-0 grid-cols-1 gap-1.5 lg:grid-cols-12 lg:items-stretch">
            <div className="min-h-0 lg:col-span-8">
              <KpiGraph />
            </div>
            <div className="min-h-0 lg:col-span-4">
              <ResolvedTasks title="Resolved tasks" />
            </div>
          </div>
        </div>
      </section>
    </PortalLayout>
  );
}
