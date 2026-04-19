import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const INCOMING = "#3B82F6";
const RESOLVED = "#22C55E";

export default function TicketVolume({ timeline }) {
  const data = timeline ?? [];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4">
      <h3 className="shrink-0 text-[14px] font-bold text-[#111827] sm:text-[15px]">
        Ticket volume over time
      </h3>
      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#64748B] sm:mt-2.5 sm:text-[12px]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: INCOMING }}
          />
          Incoming
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: RESOLVED }}
          />
          Resolved
        </span>
      </div>

      <div className="mt-2 h-full min-h-[200px] w-full min-w-0 flex-1 sm:mt-3 sm:min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 4, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id="volIncoming" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INCOMING} stopOpacity={0.35} />
                <stop offset="100%" stopColor={INCOMING} stopOpacity={0.06} />
              </linearGradient>
              <linearGradient id="volResolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={RESOLVED} stopOpacity={0.35} />
                <stop offset="100%" stopColor={RESOLVED} stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              domain={[0, 70]}
              ticks={[0, 10, 20, 30, 40, 50, 60, 70]}
              width={32}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #F1F5F9",
                fontSize: 12,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.06)",
              }}
              labelStyle={{ color: "#64748B", marginBottom: 4 }}
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name="Resolved"
              stroke={RESOLVED}
              strokeWidth={2}
              fill="url(#volResolved)"
              dot={{ r: 3.5, fill: RESOLVED, stroke: "#fff", strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey="incoming"
              name="Incoming"
              stroke={INCOMING}
              strokeWidth={2}
              fill="url(#volIncoming)"
              dot={{ r: 3.5, fill: INCOMING, stroke: "#fff", strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
