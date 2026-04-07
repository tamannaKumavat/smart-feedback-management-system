const circles = [
  { r: 56, pct: 74, color: "#60A5FA" },
  { r: 43, pct: 62, color: "#34D399" },
  { r: 30, pct: 53, color: "#A78BFA" },
  { r: 17, pct: 34, color: "#F472B6" },
];

export default function TopDepartmentsCard({ departments }) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto rounded-xl border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4">
      <h3 className="shrink-0 text-[14px] font-bold text-[#111827] sm:text-[15px]">Top 4 departments</h3>
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 items-center gap-2 sm:mt-3 sm:grid-cols-[1fr_auto] sm:gap-3">
        <svg
          viewBox="0 0 160 160"
          className="mx-auto h-[min(120px,28vh)] w-[min(120px,28vh)] max-w-[140px] shrink-0 sm:h-32 sm:w-32 sm:max-w-[160px]"
          aria-hidden
        >
          {circles.map((ring) => (
            <g key={ring.r} transform="rotate(-90 80 80)">
              <circle cx="80" cy="80" r={ring.r} fill="none" stroke="#F1F5F9" strokeWidth="8" />
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

        <div className="mx-auto w-full max-w-[200px] space-y-2 sm:max-w-none sm:space-y-2.5">
          {departments.map((dep) => (
            <div key={dep.name} className="flex items-center gap-2 text-[12px] sm:text-[13px]">
              <span
                className="h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5"
                style={{ backgroundColor: dep.color }}
              />
              <span className="font-medium" style={{ color: dep.color }}>
                {dep.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
