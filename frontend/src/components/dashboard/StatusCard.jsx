export default function StatusCard({ list }) {
  const pieStyle = {
    background: `conic-gradient(
      ${list[0].color} 0% ${list[0].value}%,
      ${list[1].color} ${list[0].value}% ${list[0].value + list[1].value}%,
      ${list[2].color} ${list[0].value + list[1].value}% ${list[0].value + list[1].value + list[2].value}%,
      ${list[3].color} ${list[0].value + list[1].value + list[2].value}% ${list[0].value + list[1].value + list[2].value + list[3].value}%,
      ${list[4].color} ${list[0].value + list[1].value + list[2].value + list[3].value}% 100%
    )`,
  }

  return (
    <div className="rounded-xl bg-surface-card p-5 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-heading6 font-semibold text-content">Total Tickets by Status</h3>
        <span className="text-captionsmall text-content-muted">All Agents ▾</span>
      </div>
      <div className="grid grid-cols-[1fr_140px] items-center gap-3">
        <div className="space-y-2">
          {list.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-captionlarge">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-content-muted">{item.label}</span>
              </div>
              <span className="font-semibold" style={{ color: item.color }}>
                {item.value}%
              </span>
            </div>
          ))}
        </div>
        <div className="mx-auto h-36 w-36 rounded-full" style={pieStyle} />
      </div>
    </div>
  )
}
