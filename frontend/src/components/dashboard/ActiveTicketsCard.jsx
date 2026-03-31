function StatusPill({ status }) {
  if (status === 'Open') return <span className="rounded-full bg-[#3B82F6] px-2.5 py-1 text-captionsmall font-semibold text-white">Open</span>
  if (status === 'New') return <span className="rounded-full bg-[#F4A340] px-2.5 py-1 text-captionsmall font-semibold text-white">New</span>
  return <span className="rounded-full bg-[#8B5CF6] px-2.5 py-1 text-captionsmall font-semibold text-white">Pending</span>
}

export default function ActiveTicketsCard({ items }) {
  return (
    <div className="rounded-xl bg-surface-card p-5 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-heading6 font-semibold text-content">All Active Tickets</h3>
        <div className="flex gap-4 text-captionsmall text-content-muted">
          <span className="text-[#D6A34A]">● 15</span>
          <span className="text-[#3B82F6]">● 23</span>
          <span className="text-[#8B5CF6]">● 08</span>
        </div>
      </div>
      <div className="space-y-3 max-h-[330px] overflow-y-auto pr-1">
        {items.map((ticket) => (
          <div key={ticket.id} className="rounded-xl bg-surface-page px-4 py-3 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-captionlarge font-medium text-content">{ticket.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-captionsmall text-content-muted">
                  <span>{ticket.assignee}</span>
                  {ticket.level ? <span>• {ticket.level}</span> : null}
                  <span className="rounded-sm bg-brand-gray/15 px-2 py-0.5">{ticket.team}</span>
                  <span className={ticket.priority === 'Low' ? 'text-[#10B981]' : 'text-[#D6A34A]'}>{ticket.priority}</span>
                </div>
              </div>
              <div className="text-right">
                <StatusPill status={ticket.status} />
                <p className="mt-1 text-extrasmall text-content-muted">
                  {ticket.age} • {ticket.date}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
