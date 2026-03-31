export default function AgentsLeadershipCard({ agents }) {
  return (
    <div className="rounded-xl bg-surface-card p-5 shadow-md">
      <h3 className="text-heading6 font-semibold text-content">Agents Leadership</h3>
      <div className="mt-5 space-y-4">
        {agents.map((agent, index) => (
          <div key={agent.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-brand-gray/25" />
              <p className="text-captionlarge font-medium text-content">
                {index + 1}. {agent.name}
              </p>
            </div>
            <p className="text-captionsmall text-content-muted">
              ✈ {agent.hours} &nbsp; ◷ {agent.minutes}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
