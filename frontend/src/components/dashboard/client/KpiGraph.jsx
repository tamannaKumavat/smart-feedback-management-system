import { useId } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const DEFAULT_DATA_12 = [30, 34, 38, 36, 40, 42, 45, 65, 55, 85, 70, 90];

export default function KpiGraph({
  title = "KPI Performance",
  data: dataProp = DEFAULT_DATA_12,
}) {
  const data = dataProp.length === 12 ? dataProp : DEFAULT_DATA_12;
  const barGradId = `kpi-bar-${useId().replace(/:/g, "")}`;
  const reflectGradId = `kpi-ref-${useId().replace(/:/g, "")}`;
  const W = 820;
  const H = 208;
  const padL = 28;
  const padR = 28;
  const labelH = 22;
  const reflectH = 14;
  const padT = 10;
  const baseline = H - labelH - reflectH;
  const chartH = baseline - padT;
  const n = data.length;
  const innerW = W - padL - padR;
  const barW = innerW / n;
  const maxVal = Math.max(...data, 1);

  const gridYs = [
    padT + chartH * 0.25,
    padT + chartH * 0.5,
    padT + chartH * 0.75,
  ];

  return (
    <article className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-[4px] border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4">
      <div className="border-b border-[#F3F4F6] pb-2 sm:pb-3">
        <h2 className="text-[14px] font-bold text-[#111827] sm:text-[15px]">
          {title}
        </h2>
      </div>
      <div className="min-h-0 flex-1 pt-2 sm:pt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-full max-h-[min(200px,32vh)] min-h-[120px] w-full max-w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#BFDBFE" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#DBEAFE" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={reflectGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.14" />
              <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridYs.map((gy) => (
            <line
              key={gy}
              x1={padL}
              y1={gy}
              x2={W - padR}
              y2={gy}
              stroke="#F3F4F6"
              strokeWidth="1"
            />
          ))}

          {data.map((v, i) => {
            const x = padL + i * barW;
            const h = (v / maxVal) * chartH;
            const y = baseline - h;
            return (
              <g key={`bar-${i}`}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  fill={`url(#${barGradId})`}
                />
                <line
                  x1={x}
                  y1={y}
                  x2={x + barW}
                  y2={y}
                  stroke="#2563EB"
                  strokeWidth={2}
                />
              </g>
            );
          })}

          <rect
            x={padL}
            y={baseline}
            width={innerW}
            height={reflectH}
            fill={`url(#${reflectGradId})`}
          />

          {MONTHS.map((m, j) => {
            const i = j + 6;
            const cx = padL + i * barW + barW / 2;
            return (
              <text
                key={m}
                x={cx}
                y={H - 6}
                textAnchor="middle"
                fill="#9CA3AF"
                style={{ fontSize: "10px" }}
              >
                {m}
              </text>
            );
          })}
        </svg>
      </div>
    </article>
  );
}
