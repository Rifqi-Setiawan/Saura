import React from "react";
import { SiteSummary, SiteStatus } from "../types.ts";
import { AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, ArrowUpRight } from "lucide-react";

interface SiteCardProps {
  site: SiteSummary;
  onSelect: (siteId: string) => void;
}

export const SiteCard: React.FC<SiteCardProps> = ({ site, onSelect }) => {
  const getStatusBadge = (status: SiteStatus, perf: number | null) => {
    switch (status) {
      case "NORMAL":
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>NORMAL {perf !== null ? `(${Math.round(perf * 100)}%)` : ""}</span>
          </div>
        );
      case "ACTION":
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span>ACTION {perf !== null ? `(${Math.round(perf * 100)}%)` : ""}</span>
          </div>
        );
      case "CRITICAL":
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold animate-pulse">
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
            <span>CRITICAL</span>
          </div>
        );
      case "NO_DATA":
      default:
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 text-xs">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>NO DATA</span>
          </div>
        );
    }
  };

  const lossFormatted =
    site.loss_idr && site.loss_idr > 0
      ? `Rp${site.loss_idr.toLocaleString("id-ID")}`
      : "Rp0";

  return (
    <div
      onClick={() => onSelect(site.id)}
      className="group bg-[#0f172a] hover:bg-[#131d35] border border-slate-800 hover:border-slate-700 rounded-xl p-5 cursor-pointer transition-all duration-150 flex flex-col justify-between relative shadow-sm"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-base text-slate-100 group-hover:text-amber-400 transition-colors">
              {site.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {site.city}, {site.province} • {site.kwp} kWp
            </p>
          </div>
          {getStatusBadge(site.status, site.performance)}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-800/80">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
              Aktual
            </span>
            <span className="text-base font-semibold text-slate-100 tabular-nums">
              {site.actual_kwh !== null ? `${site.actual_kwh.toFixed(1)}` : "-"}
              <span className="text-xs font-normal text-slate-400 ml-0.5">kWh</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
              Perkiraan
            </span>
            <span className="text-base font-semibold text-slate-300 tabular-nums">
              {site.expected_kwh !== null ? `${site.expected_kwh.toFixed(1)}` : "-"}
              <span className="text-xs font-normal text-slate-400 ml-0.5">kWh</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
              Selisih
            </span>
            <span
              className={`text-base font-semibold tabular-nums ${
                site.gap_kwh && site.gap_kwh > 0 ? "text-amber-400" : "text-slate-300"
              }`}
            >
              {site.gap_kwh !== null ? `${site.gap_kwh.toFixed(1)}` : "-"}
              <span className="text-xs font-normal text-slate-400 ml-0.5">kWh</span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div>
          {site.loss_idr && site.loss_idr > 0 ? (
            <span className="text-amber-400/90 font-medium">
              Potensi rugi: <span className="tabular-nums font-semibold">{lossFormatted}</span>
            </span>
          ) : (
            <span className="text-slate-500">Operasi normal</span>
          )}
        </div>
        <div className="flex items-center space-x-1 text-slate-400 group-hover:text-amber-400 transition-colors">
          <span>Rincian</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
};
