import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const severityColors = {
  S1: 'bg-red-100 text-red-700',
  S2: 'bg-orange-100 text-orange-700',
  S3: 'bg-yellow-100 text-yellow-700',
  S4: 'bg-gray-100 text-gray-600',
}

export default function Home() {
  const [feedbackList, setFeedbackList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/feedback')
      .then((res) => res.json())
      .then((data) => {
        setFeedbackList(data)
        setLoading(false)
      })
      .catch((err) => {
        setError('Failed to load feedback.')
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-700 mb-4">All Feedback</h2>
      <div className="space-y-3">
        {feedbackList.map((item) => {
          const firstMessage = item.conversation[0]?.content ?? ''
          const snippet = firstMessage.length > 80 ? firstMessage.slice(0, 80) + '…' : firstMessage
          const severity = item.labels?.severity ?? 'S4'

          return (
            <Link
              key={item.case_id}
              to={`/client/feedback/${item.case_id}`}
              className="block bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-gray-300 hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-medium text-gray-800">{item.case_id}</span>
                <div className="flex gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[severity] ?? severityColors.S4}`}>
                    {severity}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gray/15 text-brand-gray font-medium capitalize">
                    {item.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500">{snippet}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
