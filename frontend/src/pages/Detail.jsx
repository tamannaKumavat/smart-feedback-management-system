import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

const severityColors = {
  S1: 'bg-red-100 text-red-700',
  S2: 'bg-orange-100 text-orange-700',
  S3: 'bg-yellow-100 text-yellow-700',
  S4: 'bg-gray-100 text-gray-600',
}

export default function Detail() {
  const { caseId } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [aiResponse, setAiResponse] = useState(null)

  useEffect(() => {
    fetch(`/feedback/${caseId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((data) => {
        setRecord(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load feedback.')
        setLoading(false)
      })
  }, [caseId])

  function handleProcess() {
    setProcessing(true)
    setAiResponse(null)
    fetch(`/feedback/process/${caseId}`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        setAiResponse(data.watsonx_response)
        setProcessing(false)
      })
      .catch(() => {
        setAiResponse('Error: failed to get AI response.')
        setProcessing(false)
      })
  }

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (error) return <p className="text-red-500">{error}</p>

  const severity = record.labels?.severity ?? 'S4'
  const intent = record.labels?.intent ?? '—'

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to all feedback
      </Link>

      <div className="bg-white border border-gray-200 rounded-lg px-6 py-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-base font-semibold text-gray-800">{record.case_id}</h2>
          <div className="flex gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[severity] ?? severityColors.S4}`}>
              {severity}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium capitalize">
              {intent}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {record.conversation.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-lg px-4 py-2 rounded-2xl text-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleProcess}
        disabled={processing}
        className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {processing ? 'Processing…' : 'Process with AI'}
      </button>

      {processing && (
        <div className="mt-4 flex items-center gap-2 text-gray-500 text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Waiting for WatsonX response…
        </div>
      )}

      {aiResponse && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">AI Response</h3>
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">{aiResponse}</pre>
        </div>
      )}
    </div>
  )
}
