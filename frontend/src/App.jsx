import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/auth/Login.jsx'
import SignUp from './pages/auth/SignUp.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'
import ClientDashboard from './pages/client/ClientDashboard.jsx'
import ClientCreateFeedback from './pages/client/ClientCreateFeedback.jsx'
import ClientFeedbackHistory from './pages/client/ClientFeedbackHistory.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminCustomers from './pages/admin/AdminCustomers.jsx'
import AdminActivityLog from './pages/admin/AdminActivityLog.jsx'
import { getSession, onSessionChange } from './lib/session.js'

function defaultRouteByRole(role) {
  return role === 'admin' ? '/admin/dashboard' : '/client/dashboard'
}

function RoleRoute({ user, allowedRole, element }) {
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== allowedRole) return <Navigate to={defaultRouteByRole(user.role)} replace />
  return element
}

export default function App() {
  const [session, setSession] = useState(() => getSession())
  useEffect(() => {
    return onSessionChange(() => setSession(getSession()))
  }, [])

  const user = session?.user ?? null

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={defaultRouteByRole(user.role)} replace />} />
      <Route path="/signup" element={!user ? <SignUp /> : <Navigate to={defaultRouteByRole(user.role)} replace />} />
      <Route
        path="/forgot-password"
        element={!user ? <ForgotPassword /> : <Navigate to={defaultRouteByRole(user.role)} replace />}
      />

      <Route
        path="/client/dashboard"
        element={<RoleRoute user={user} allowedRole="client" element={<ClientDashboard />} />}
      />
      <Route
        path="/client/create-feedback"
        element={<RoleRoute user={user} allowedRole="client" element={<ClientCreateFeedback />} />}
      />
      <Route
        path="/client/feedback-history"
        element={<RoleRoute user={user} allowedRole="client" element={<ClientFeedbackHistory />} />}
      />

      <Route
        path="/admin/dashboard"
        element={<RoleRoute user={user} allowedRole="admin" element={<AdminDashboard />} />}
      />
      <Route
        path="/admin/customers"
        element={<RoleRoute user={user} allowedRole="admin" element={<AdminCustomers />} />}
      />
      <Route
        path="/admin/activity-log"
        element={<RoleRoute user={user} allowedRole="admin" element={<AdminActivityLog />} />}
      />

      <Route path="/" element={<Navigate to={user ? defaultRouteByRole(user.role) : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? defaultRouteByRole(user.role) : '/login'} replace />} />
    </Routes>
  )
}
