import PortalLayout from '../../layouts/PortalLayout.jsx'
import { feedbackHistoryDummy } from '../../data/clientFeedbackDummyData.js'

const statusStyle = {
  open: 'bg-[#DBEAFE] text-[#1D4ED8]',
  in_review: 'bg-[#FEF3C7] text-[#B45309]',
  pending: 'bg-[#EDE9FE] text-[#6D28D9]',
  resolved: 'bg-[#DCFCE7] text-[#15803D]',
}

export default function ClientFeedbackHistory() {
  return (
    <PortalLayout mode="client">
      <div className="mx-auto max-w-4xl rounded-xl bg-surface-card p-8 shadow-md">
        <h1 className="text-heading6 font-semibold text-content">Feedback History</h1>
        <p className="mt-1 text-captionlarge text-content-muted">Your submitted feedback, status and date</p>

        <div className="mt-6 overflow-hidden rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-page text-left text-captionsmall text-content-muted">
                <th className="px-4 py-3">Feedback</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {feedbackHistoryDummy.map((item) => (
                <tr key={item.id} className="border-b border-surface-page last:border-0">
                  <td className="px-4 py-4">
                    <p className="text-bodysmall font-medium text-content">{item.title}</p>
                    <p className="text-captionsmall text-content-muted">{item.id}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-captionsmall font-medium ${statusStyle[item.status]}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-captionsmall text-content-muted">{item.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  )
}
