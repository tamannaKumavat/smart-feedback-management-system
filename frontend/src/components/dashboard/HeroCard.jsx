export default function HeroCard({ hero }) {
  return (
    <div className="relative h-[172px] overflow-hidden rounded-xl bg-[#30384A] px-6 py-5 text-white shadow-lg">
      <p className="text-heading6 font-bold leading-tight">
        <span className="text-[#30D0B1]">Congratulations</span> Henry Ryan!
      </p>
      <p className="mt-1 text-captionlarge text-white/90">{hero.subtitle}</p>
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full border-2 border-white/30 bg-[#D1A981]" />
          <div>
            <div className="flex items-end gap-2">
              <p className="text-heading5_b font-bold leading-none">{hero.resolved}</p>
              <p className="mb-1 text-bodysmall text-white/80">Tickets Resolved</p>
            </div>
            <p className="mt-2 text-captionlarge text-white/70">
              ✈ {hero.hours} &nbsp;&nbsp; ◷ {hero.minutes}
            </p>
          </div>
        </div>
      </div>
      <div className="absolute right-4 top-5 text-[72px] leading-none">🏆</div>
    </div>
  )
}
