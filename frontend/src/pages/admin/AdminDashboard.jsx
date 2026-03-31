import PortalLayout from '../../layouts/PortalLayout.jsx'
import { adminDashboardData } from '../../data/adminDashboardData.js'
import ActiveTicketsCard from '../../components/dashboard/ActiveTicketsCard.jsx'
import AgentsLeadershipCard from '../../components/dashboard/AgentsLeadershipCard.jsx'
import CustomerSatisfactionCard from '../../components/dashboard/CustomerSatisfactionCard.jsx'
import HeroCard from '../../components/dashboard/HeroCard.jsx'
import PerformanceCard from '../../components/dashboard/PerformanceCard.jsx'
import StatusCard from '../../components/dashboard/StatusCard.jsx'
import SummaryCard from '../../components/dashboard/SummaryCard.jsx'
import TopDepartmentsCard from '../../components/dashboard/TopDepartmentsCard.jsx'

export default function AdminDashboard() {
  return (
    <PortalLayout mode="admin">
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.25fr]">
          {adminDashboardData.summaryCards.map((card) => (
            <SummaryCard key={card.id} card={card} />
          ))}
          <HeroCard hero={adminDashboardData.hero} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <ActiveTicketsCard items={adminDashboardData.activeTickets} />
          <div className="space-y-4">
            <StatusCard list={adminDashboardData.statusBreakdown} />
            <div className="grid gap-4 sm:grid-cols-2">
              {adminDashboardData.performanceCards.map((card) => (
                <PerformanceCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1.1fr]">
          <CustomerSatisfactionCard satisfaction={adminDashboardData.satisfaction} />
          <AgentsLeadershipCard agents={adminDashboardData.agents} />
          <TopDepartmentsCard departments={adminDashboardData.departments} />
        </div>
      </div>
    </PortalLayout>
  )
}
