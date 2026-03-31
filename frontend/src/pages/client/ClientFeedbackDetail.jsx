import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import Detail from '../Detail.jsx'

const clientNavItems = [{ to: '/client/dashboard', label: 'Dashboard' }]

export default function ClientFeedbackDetail({ user }) {
  return (
    <DashboardLayout title="Feedback Detail" user={user} navItems={clientNavItems}>
      <Detail />
    </DashboardLayout>
  )
}
