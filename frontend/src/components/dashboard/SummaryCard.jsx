import MiniTrend from './MiniTrend.jsx'

export default function SummaryCard({ card }) {
  return (
    <div className="h-[172px] rounded-xl bg-surface-card px-6 py-5 shadow-md">
      <div className="flex items-center justify-between text-captionlarge text-content-muted">
        <span className="font-semibold text-content">
          {card.change} <span className="text-[#22C55E]">↗</span>
        </span>
        <span className="text-captionlarge text-[#6F85A3]">
          This Week <span className="ml-1 text-captionsmall">⌄</span>
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-heading5 font-semibold leading-none text-[#1F2937]">{card.value}</p>
          <p className="mt-2 text-subheading text-[#4B5563]">{card.title}</p>
        </div>
        <MiniTrend points={card.trend} />
      </div>
    </div>
  )
}
