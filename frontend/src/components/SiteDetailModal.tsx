import React, { useState } from "react";
import { SiteDetail } from "../types.ts";
import { api } from "../api.ts";
import { X, FileText, Download, UserCheck, MapPin, Gauge } from "lucide-react";

interface SiteDetailModalProps {
  site: SiteDetail | null;
  onClose: () => void;
}

export const SiteDetailModal: React.FC<SiteDetailModalProps> = ({ site, onClose }) => {
  const [downloading, setDownloading] = useState<"pdf" | "csv" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  if (!site) return null;

  const downloadReport = async (format: "pdf" | "csv") => {
    setDownloading(format);
    setDownloadError(null);
    try {
      await api.downloadWeeklyReport(site.id, format);
    } catch (error: unknown) {
      setDownloadError(error instanceof Error ? error.message : "Gagal mengunduh laporan. Coba lagi.");
    } finally {
      setDownloading(null);
    }
  };

  const maxVal = Math.max(
    ...site.last_7_days.map((d) => Math.max(d.actual_kwh || 0, d.expected_kwh || 0)),
    35
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{site.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                {site.kwp} kWp
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
              <span className="flex items-center">
                <MapPin className="h-3 w-3 mr-1 text-slate-500" />
                {site.city}, {site.province}
              </span>
              {site.operator && (
                <span className="flex items-center">
                  <UserCheck className="h-3 w-3 mr-1 text-slate-500" />
                  Operator:{" "}
                  {site.operator.name.toLowerCase().startsWith(site.operator.honorific.toLowerCase())
                    ? site.operator.name
                    : `${site.operator.honorific} ${site.operator.name}`}
                </span>
              )}
              <span className="flex items-center">
                <Gauge className="h-3 w-3 mr-1 text-slate-500" />
                PR Base: {site.pr_default}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Today Assessment Summary */}
          {site.today_assessment && (
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
                  Penilaian Hari Ini ({site.today_assessment.date})
                </span>
                <div className="flex items-center space-x-3 mt-1">
                  <span
                    className={`text-sm font-bold px-2 py-0.5 rounded ${
                      site.today_assessment.status === "NORMAL"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : site.today_assessment.status === "ACTION"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {site.today_assessment.status}
                  </span>
                  <span className="text-sm text-slate-300">
                    Aktual: <strong className="text-white tabular-nums">{site.today_assessment.actual_kwh?.toFixed(1)} kWh</strong> (Target: {site.today_assessment.expected_kwh?.toFixed(1)} kWh)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
                  Sumber Cuaca
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {site.today_assessment.weather_source || "Open-Meteo Solar API"}
                </span>
              </div>
            </div>
          )}

          {/* 7-Day Performance Bar Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-200">
                Tren Produksi 7 Hari Terakhir (kWh)
              </h4>
              <div className="flex items-center space-x-4 text-xs text-slate-400">
                <span className="flex items-center">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm mr-1.5 inline-block"></span>
                  Aktual
                </span>
                <span className="flex items-center">
                  <span className="w-2.5 h-2.5 bg-slate-700 rounded-sm mr-1.5 inline-block"></span>
                  Perkiraan
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
              <div className="grid grid-cols-7 gap-3 items-end h-44 pt-4 pb-2">
                {site.last_7_days.map((day, idx) => {
                  const actHeight = day.actual_kwh ? (day.actual_kwh / maxVal) * 100 : 0;
                  const expHeight = day.expected_kwh ? (day.expected_kwh / maxVal) * 100 : 0;
                  const dateShort = day.date.slice(5);

                  return (
                    <div key={idx} className="flex flex-col items-center h-full justify-end group">
                      <div className="w-full flex items-end justify-center space-x-1 h-32 relative">
                        {/* Expected Bar */}
                        <div
                          style={{ height: `${expHeight}%` }}
                          className="w-2.5 bg-slate-700 rounded-t-sm"
                          title={`Perkiraan: ${day.expected_kwh?.toFixed(1)} kWh`}
                        ></div>
                        {/* Actual Bar */}
                        <div
                          style={{ height: `${actHeight}%` }}
                          className={`w-3.5 rounded-t-sm transition-all ${
                            day.status === "NORMAL"
                              ? "bg-emerald-500 group-hover:bg-emerald-400"
                              : day.status === "ACTION"
                              ? "bg-amber-500 group-hover:bg-amber-400"
                              : "bg-rose-500 group-hover:bg-rose-400"
                          }`}
                          title={`Aktual: ${day.actual_kwh?.toFixed(1)} kWh`}
                        ></div>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 mt-2 tabular-nums">
                        {dateShort}
                      </span>
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {day.actual_kwh !== null ? `${day.actual_kwh.toFixed(0)}` : "-"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Downloads */}
          {downloadError && <p role="alert" className="text-sm text-rose-300">{downloadError}</p>}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-800" aria-busy={downloading !== null}>
            <button
              type="button"
              onClick={() => downloadReport("csv")}
              disabled={downloading !== null}
              className="flex min-h-11 items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-wait focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <Download className="h-4 w-4 text-slate-400" />
              <span>{downloading === "csv" ? "Menyiapkan CSV…" : "Ekspor Data CSV"}</span>
            </button>
            <button
              type="button"
              onClick={() => downloadReport("pdf")}
              disabled={downloading !== null}
              className="flex min-h-11 items-center space-x-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <FileText className="h-4 w-4 text-slate-950" />
              <span>{downloading === "pdf" ? "Menyiapkan PDF…" : "Unduh Laporan Mingguan PDF"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
