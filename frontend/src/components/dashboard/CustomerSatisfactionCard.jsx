export default function CustomerSatisfactionCard({ satisfaction }) {
  return (
    <div className="rounded-xl bg-surface-card p-5 shadow-md">
      <h3 className="text-heading6 font-semibold text-content">Customer Satisfaction</h3>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div>
          <p className="text-captionsmall text-content-muted">Total Received</p>
          <p className="mt-1 text-heading5_b font-semibold">{satisfaction.totalReceived}</p>
        </div>
        <div>
          <p className="text-captionsmall text-content-muted">Great</p>
          <p className="mt-1 text-heading5_b font-semibold">%{satisfaction.greatPercent}</p>
        </div>
        <div className="flex items-center justify-center">
          <div className="h-10 w-10 rounded-full bg-[#34D399] text-center text-xl leading-10">☺</div>
        </div>
      </div>
      <div className="mt-6 h-2 rounded-full bg-surface-page">
        <div className="h-full rounded-full bg-[#34D399]" style={{ width: `${satisfaction.greatPercent}%` }} />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {satisfaction.breakdown.map((item) => (
          <div key={item.label}>
            <p className="text-captionsmall text-content-muted">{item.label}</p>
            <p className="text-subheading font-semibold" style={{ color: item.color }}>
              %{item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
