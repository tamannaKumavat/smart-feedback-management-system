export default function MiniTrend({ points }) {
  const width = 120
  const height = 36
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = width / (points.length - 1)

  const path = points
    .map((value, index) => {
      const x = index * step
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-[120px]">
      <path d={path} fill="none" stroke="#93A2AF" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
