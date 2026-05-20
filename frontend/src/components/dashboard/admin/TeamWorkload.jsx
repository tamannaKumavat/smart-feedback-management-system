import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const OPEN = "#F59E0B";
const RESOLVED = "#34D399";

export default function TeamWorkload({ items = [] }) {
  const data = items;

  if (!data.length) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center rounded-xl border border-[#F3F4F6] bg-white p-3 text-[12px] text-[#94A3B8] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4">
        No team workload data yet.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4">
      <div className="shrink-0">
        <h3 className="text-[14px] font-bold text-[#111827] sm:text-[15px]">
          Team workload distribution
        </h3>
        <p className="mt-0.5 text-[11px] font-medium text-[#94A3B8] sm:text-[12px]">
          Open vs. resolved tickets per team
        </p>
      </div>
      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#64748B] sm:mt-2.5 sm:text-[12px]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: OPEN }}
          />
          Open
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
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, left: 0, bottom: 4 }}
            barCategoryGap="22%"
          >
            <CartesianGrid stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="team"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              dy={6}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              width={32}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.08)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #F1F5F9",
                fontSize: 12,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.06)",
              }}
              labelStyle={{ color: "#64748B", marginBottom: 4 }}
            />
            <Legend wrapperStyle={{ display: "none" }} />
            <Bar
              dataKey="open"
              name="Open"
              fill={OPEN}
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
            />
            <Bar
              dataKey="resolved"
              name="Resolved"
              fill={RESOLVED}
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
