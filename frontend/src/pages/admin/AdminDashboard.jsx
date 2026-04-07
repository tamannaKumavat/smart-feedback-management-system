import PortalLayout from "../../layouts/PortalLayout.jsx";
import { adminDashboardData } from "../../data/adminDashboardData.js";
import ActiveTicketsCard from "../../components/dashboard/admin/ActiveTicketsCard.jsx";
import SolvedTicketsByDepartments from "../../components/dashboard/admin/SolvedTicketsByDepartment.jsx";
import CustomerSatisfactionCard from "../../components/dashboard/admin/CustomerSatisfactionCard.jsx";
import PerformanceCard from "../../components/dashboard/admin/PerformanceCard.jsx";
import StatusCard from "../../components/dashboard/admin/StatusCard.jsx";
import SummaryCard from "../../components/dashboard/admin/SummaryCard.jsx";
import TicketVolume from "../../components/dashboard/admin/TicketVolume.jsx";

export default function AdminDashboard() {
  return (
    <PortalLayout mode="admin">
      <section className="mx-auto flex w-full max-w-[min(100%,1600px)] flex-col gap-4 overflow-x-hidden max-lg:min-h-0 lg:h-[calc(100dvh-7.5rem)] lg:max-h-[calc(100dvh-7.5rem)] lg:min-h-0 lg:overflow-hidden">
        <div className="grid w-full shrink-0 grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
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

        <div className="grid min-h-0 w-full flex-[1.2] basis-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="min-h-0 min-w-0 lg:col-span-9">
            <ActiveTicketsCard items={adminDashboardData.activeTickets} />
          </div>
          <div className="min-h-0 min-w-0 lg:col-span-3">
            <StatusCard
              list={adminDashboardData.statusBreakdown}
              total={adminDashboardData.statusGrandTotal}
            />
          </div>
        </div>

        <div className="grid min-h-0 w-full flex-1 basis-0 grid-cols-1 gap-4 min-[480px]:grid-cols-3 min-[480px]:items-stretch">
          <div className="min-h-0 w-full min-w-0">
          <CustomerSatisfactionCard
              satisfaction={adminDashboardData.satisfaction}
            />
          </div>
          <div className="min-h-0 w-full min-w-0">
            <SolvedTicketsByDepartments
              items={adminDashboardData.solvedTicketsByDepartment}
            />
          </div>
          <div className="min-h-0 w-full min-w-0">
            <TicketVolume timeline={adminDashboardData.ticketVolumeOverTime} />
          </div>
        </div>
      </section>
    </PortalLayout>
  );
}
