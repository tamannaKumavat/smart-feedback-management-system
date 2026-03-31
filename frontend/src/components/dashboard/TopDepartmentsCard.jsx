const circles = [
  { r: 56, pct: 74, color: '#3B82F6' },
  { r: 43, pct: 62, color: '#10B981' },
  { r: 30, pct: 53, color: '#8B5CF6' },
  { r: 17, pct: 34, color: '#EC4899' },
]

export default function TopDepartmentsCard({ departments }) {
  return (
    <div className="rounded-xl bg-surface-card p-5 shadow-md">
      <h3 className="text-heading6 font-semibold text-content">Top 4 Departments</h3>
      <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4">
        <svg viewBox="0 0 160 160" className="h-44 w-44">
          {circles.map((ring) => (
            <g key={ring.r} transform="rotate(-90 80 80)">
              <circle cx="80" cy="80" r={ring.r} fill="none" stroke="#EEF1F4" strokeWidth="8" />
              <circle
                cx="80"
                cy="80"
                r={ring.r}
                fill="none"
                stroke={ring.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(2 * Math.PI * ring.r * ring.pct) / 100} ${2 * Math.PI * ring.r}`}
              />
            </g>
          ))}
        </svg>

        <div className="space-y-3">
          {departments.map((dep) => (
            <div key={dep.name} className="flex items-center gap-2 text-captionlarge">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dep.color }} />
              <span style={{ color: dep.color }}>{dep.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
