import React from "react";
import { SiteDetail, DayMetric } from "../types.ts";

interface TelemetryChartCardProps {
  siteDetail: SiteDetail | null;
  onOpenDetailModal?: () => void;
}

export const TelemetryChartCard: React.FC<TelemetryChartCardProps> = ({
  siteDetail,
  onOpenDetailModal,
}) => {
  // Use either actual site metrics or fallback to standard demo points matching the reference image
  const defaultDays: DayMetric[] = [
    { date: "2026-10-20", actual_kwh: 30.5, expected_kwh: 31.8, gap_kwh: -1.3, performance: 0.96, loss_idr: 1950, status: "NORMAL", weather_source: "Open-Meteo" },
    { date: "2026-10-21", actual_kwh: 29.8, expected_kwh: 31.5, gap_kwh: -1.7, performance: 0.94, loss_idr: 2550, status: "NORMAL", weather_source: "Open-Meteo" },
    { date: "2026-10-22", actual_kwh: 28.0, expected_kwh: 31.7, gap_kwh: -3.7, performance: 0.88, loss_idr: 5550, status: "NORMAL", weather_source: "Open-Meteo" },
    { date: "2026-10-23", actual_kwh: 25.4, expected_kwh: 31.6, gap_kwh: -6.2, performance: 0.80, loss_idr: 9300, status: "ACTION", weather_source: "Open-Meteo" },
    { date: "2026-10-24", actual_kwh: 22.1, expected_kwh: 31.9, gap_kwh: -9.8, performance: 0.69, loss_idr: 14700, status: "ACTION", weather_source: "Open-Meteo" },
    { date: "2026-10-25", actual_kwh: 20.8, expected_kwh: 31.8, gap_kwh: -11.0, performance: 0.65, loss_idr: 16500, status: "ACTION", weather_source: "Open-Meteo" },
    { date: "2026-10-26", actual_kwh: 20.0, expected_kwh: 32.0, gap_kwh: -12.0, performance: 0.62, loss_idr: 18000, status: "ACTION", weather_source: "Open-Meteo" },
  ];

  const days = siteDetail && siteDetail.last_7_days && siteDetail.last_7_days.length >= 7
    ? siteDetail.last_7_days.slice(-7)
    : defaultDays;

  // Chart dimensions & scaling
  const width = 560;
  const height = 200;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  const maxY = 40;

  const getX = (index: number) => paddingLeft + (index / (days.length - 1)) * chartW;
  const getY = (val: number) => paddingTop + chartH - (val / maxY) * chartH;

  // Expected curve path
  const expectedPoints = days.map((d, i) => `${getX(i)},${getY(d.expected_kwh || 31.5)}`);
  const expectedPath = `M ${expectedPoints.join(" L ")}`;

  // Actual curve path
  const actualPoints = days.map((d, i) => ({
    x: getX(i),
    y: getY(d.actual_kwh || 0),
    val: d.actual_kwh,
    date: d.date,
  }));
  const actualPath = `M ${actualPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length >= 3) {
      const day = parts[2];
      return `${day} Okt`;
    }
    return dateStr;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between h-full">
      {/* Header & Legend */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <button
            onClick={onOpenDetailModal}
            className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
          >
            {siteDetail?.name || "MA Nurul Huda"}
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-2xs"></span>
            <span>Aktual</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
            <span>Perkiraan</span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Line Chart */}
      <div className="w-full overflow-hidden my-auto pt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Horizontal Grid Lines & Y-Labels */}
          {[40, 30, 20, 10, 0].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1.2"
                  strokeDasharray={val === 0 ? "none" : "3 3"}
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] font-medium fill-slate-400 tabular-nums"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Unit Label */}
          <text
            x={paddingLeft - 10}
            y={paddingTop - 6}
            textAnchor="end"
            className="text-[10px] font-semibold fill-slate-400 uppercase"
          >
            kWh
          </text>

          {/* Expected Line (Dashed/Dotted Gray) */}
          <path
            d={expectedPath}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Actual Line (Solid Blue) */}
          <path
            d={actualPath}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Actual Data Points (Nodes) */}
          {actualPoints.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                className="fill-white stroke-blue-600 stroke-2 group-hover:r-6 transition-all"
              />
              <title>{`${formatDateLabel(p.date)}: ${p.val?.toFixed(1)} kWh`}</title>
            </g>
          ))}

          {/* X-Axis Date Labels */}
          {days.map((d, idx) => {
            const x = getX(idx);
            return (
              <text
                key={idx}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="text-[11px] font-medium fill-slate-400"
              >
                {formatDateLabel(d.date)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Footer Caption / Disclaimer */}
      <div className="pt-2 border-t border-slate-50 mt-1">
        <p className="text-[11px] text-slate-400">
          Nilai contoh untuk demonstrasi. Perkiraan memakai cuaca historis.
        </p>
      </div>
    </div>
  );
};
