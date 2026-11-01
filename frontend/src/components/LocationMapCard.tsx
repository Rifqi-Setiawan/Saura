import React from "react";
import { SiteSummary } from "../types.ts";

interface LocationMapCardProps {
  sites: SiteSummary[];
  onSelectSite: (siteId: string) => void;
}

export const LocationMapCard: React.FC<LocationMapCardProps> = ({
  sites,
  onSelectSite,
}) => {
  // Approximate coordinates on Bandung SVG map canvas (300 x 140)
  const pinPositions: Record<string, { x: number; y: number; color: string; label: string }> = {
    "MA Nurul Huda": { x: 190, y: 35, color: "#F59E0B", label: "MA Nurul Huda" },
    "Balai Desa Cibiru": { x: 245, y: 70, color: "#DC2626", label: "Cibiru" },
    "SDN Sukamaju": { x: 140, y: 105, color: "#2563EB", label: "Sukamaju" },
    "SMP Cendekia": { x: 65, y: 65, color: "#94A3B8", label: "Cendekia" },
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Sebaran lokasi
        </h3>
        <span className="text-[11px] font-medium text-slate-400">
          Bandung Raya
        </span>
      </div>

      {/* Stylized Vector Map Canvas */}
      <div className="relative w-full h-36 bg-[#F8FAFC] border border-slate-100 rounded-xl overflow-hidden my-1 select-none">
        <svg
          viewBox="0 0 320 150"
          className="w-full h-full object-cover"
        >
          {/* Topographic Background Polygons */}
          <rect width="320" height="150" fill="#F8FAFC" />
          
          {/* Subtle Mountain / Contour Patches (North Bandung) */}
          <path
            d="M 120 0 Q 200 40 320 10 L 320 0 Z"
            fill="#F1F5F9"
            opacity="0.8"
          />
          <path
            d="M 0 110 Q 150 140 320 125 L 320 150 L 0 150 Z"
            fill="#F1F5F9"
            opacity="0.8"
          />

          {/* Road Network Lines (Major Bandung Arteries) */}
          <path
            d="M 20 80 Q 140 75 300 70"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 160 10 Q 165 75 160 140"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 50 30 Q 130 65 240 120"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="2"
            strokeDasharray="4 3"
          />

          {/* Citarum River Curve */}
          <path
            d="M 0 125 Q 80 115 150 130 T 320 115"
            fill="none"
            stroke="#DBEAFE"
            strokeWidth="4"
            opacity="0.7"
          />

          {/* City Center Marker (Alun-alun Bandung) */}
          <circle cx="160" cy="75" r="3" fill="#94A3B8" opacity="0.4" />
          <text x="160" y="88" textAnchor="middle" className="text-[8px] font-semibold fill-slate-300">
            KOTA BANDUNG
          </text>

          {/* Interactive Site Pins */}
          {sites.map((site) => {
            const conf = pinPositions[site.name] || {
              x: 160,
              y: 75,
              color: "#2563EB",
              label: site.name,
            };
            return (
              <g
                key={site.id}
                onClick={() => onSelectSite(site.id)}
                className="cursor-pointer group"
              >
                {/* Pulse ring for Critical or Action */}
                {(site.status === "CRITICAL" || site.status === "ACTION") && (
                  <circle
                    cx={conf.x}
                    cy={conf.y}
                    r="9"
                    fill={conf.color}
                    opacity="0.25"
                    className="animate-ping origin-center"
                  />
                )}
                {/* Pin Head */}
                <circle
                  cx={conf.x}
                  cy={conf.y}
                  r="6.5"
                  fill={conf.color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="shadow-md transition-transform group-hover:scale-125"
                />
                {/* Pin Label */}
                <text
                  x={conf.x}
                  y={conf.y - 9}
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-slate-700 drop-shadow-xs"
                >
                  {conf.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Map Legend */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-50">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
          <span>Kritis</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
          <span>Perlu tindakan</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
          <span>Tanpa data</span>
        </div>
      </div>
    </div>
  );
};
