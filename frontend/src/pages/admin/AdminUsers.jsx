import { useEffect, useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import { getUsers } from '../../lib/authApi.js'

const adminNavItems = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
]

export default function AdminUsers({ user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getUsers()
      .then((data) => {
        setUsers(data.users ?? [])
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout title="Users" user={user} navItems={adminNavItems}>
      {loading ? <p className="text-content-muted">Loading users...</p> : null}
      {!loading && error ? <p className="text-brand-red">{error}</p> : null}
      {!loading && !error ? (
        <div className="overflow-x-auto rounded-lg border border-border-input">
          <table className="min-w-full divide-y divide-border-input">
            <thead className="bg-surface-page">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-content-muted">Name</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-content-muted">Email</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-content-muted">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-input bg-surface-card">
              {users.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-content">{item.fullName}</td>
                  <td className="px-4 py-3 text-sm text-content-muted">{item.email}</td>
                  <td className="px-4 py-3 text-sm capitalize text-content">{item.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </DashboardLayout>
  )
}
