export default function PerformanceCard({ card }) {
  return (
    <div
      className="rounded-xl p-5 text-white shadow-md"
      style={{ background: `linear-gradient(130deg, ${card.bgFrom}, ${card.bgTo})` }}
    >
      <p className="text-captionlarge font-semibold text-white/90">{card.title}</p>
      <p className="mt-4 text-captionsmall text-white/80">{card.subtitle}</p>
      <p className="mt-1 text-heading5_b font-bold">{card.value}</p>
    </div>
  )
}
