import PortalLayout from "../../layouts/PortalLayout.jsx";
import { adminDashboardData } from "../../data/adminDashboardData.js";
import ActiveTicketsCard from "../../components/dashboard/admin/ActiveTicketsCard.jsx";
import SolvedTicketsByDepartments from "../../components/dashboard/admin/SolvedTicketsByDepartment.jsx";
import CustomerSatisfactionCard from "../../components/dashboard/admin/CustomerSatisfactionCard.jsx";
import PerformanceCard from "../../components/dashboard/admin/PerformanceCard.jsx";
import StatusCard from "../../components/dashboard/admin/StatusCard.jsx";
import SummaryCard from "../../components/dashboard/admin/SummaryCard.jsx";
import TicketVolume from "../../components/dashboard/admin/TicketVolume.jsx";
import TeamWorkload from "../../components/dashboard/admin/TeamWorkload.jsx";
import TicketTypeBreakdown from "../../components/dashboard/admin/TicketTypeBreakdown.jsx";

export default function AdminDashboard() {
  return (
    <PortalLayout mode="admin">
      <section className="mx-auto flex w-full max-w-[min(100%,1600px)] flex-col gap-4 overflow-x-hidden">
        <div className="grid w-full shrink-0 grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {adminDashboardData.summaryCards.map((card) => (
            <div key={card.id} className="min-h-0">
              <SummaryCard card={card} />
            </div>
          ))}
          {adminDashboardData.performanceCards.map((card) => (
            <div key={card.id} className="min-h-0">
              <PerformanceCard card={card} />
            </div>
          ))}
        </div>

        <div className="grid min-h-0 w-full grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="min-h-[320px] min-w-0 lg:col-span-9 lg:min-h-[360px]">
            <ActiveTicketsCard items={adminDashboardData.activeTickets} />
          </div>
          <div className="min-h-[320px] min-w-0 lg:col-span-3 lg:min-h-[360px]">
            <StatusCard
              list={adminDashboardData.statusBreakdown}
              total={adminDashboardData.statusGrandTotal}
            />
          </div>
        </div>

        <div className="grid min-h-0 w-full grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="min-h-[280px] min-w-0 lg:col-span-7 lg:min-h-[300px]">
            <TicketVolume timeline={adminDashboardData.ticketVolumeOverTime} />
          </div>
          <div className="min-h-[280px] min-w-0 lg:col-span-5 lg:min-h-[300px]">
            <TeamWorkload items={adminDashboardData.teamWorkload} />
          </div>
        </div>

        <div className="grid min-h-0 w-full grid-cols-1 gap-4 min-[480px]:grid-cols-3 min-[480px]:items-stretch">
          <div className="min-h-[280px] w-full min-w-0 lg:min-h-[320px]">
            <CustomerSatisfactionCard
              satisfaction={adminDashboardData.satisfaction}
            />
          </div>
          <div className="min-h-[280px] w-full min-w-0 lg:min-h-[320px]">
            <SolvedTicketsByDepartments
              items={adminDashboardData.solvedTicketsByDepartment}
            />
          </div>
          <div className="min-h-[280px] w-full min-w-0 lg:min-h-[320px]">
            <TicketTypeBreakdown
              items={adminDashboardData.ticketTypeBreakdown}
            />
          </div>
        </div>
      </section>
    </PortalLayout>
  );
}
