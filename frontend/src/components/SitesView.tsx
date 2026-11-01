import React, { useState } from "react";
import { SiteSummary } from "../types.ts";
import {
  Building2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Download,
  FileText,
  Gauge,
  ArrowUpRight,
  Zap,
} from "lucide-react";

interface SitesViewProps {
  sites: SiteSummary[];
  onSelectSite: (siteId: string) => void;
  onDownloadReport: (siteId: string, format: "pdf" | "csv") => void;
}

export const SitesView: React.FC<SitesViewProps> = ({
  sites,
  onSelectSite,
  onDownloadReport,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || site.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalKwp = sites.reduce((acc, s) => acc + s.kwp, 0);
  const criticalCount = sites.filter((s) => s.status === "CRITICAL").length;
  const actionCount = sites.filter((s) => s.status === "ACTION").length;
  const normalCount = sites.filter((s) => s.status === "NORMAL").length;

  const handleDownload = async (siteId: string, format: "pdf" | "csv") => {
    setDownloadingId(`${siteId}_${format}`);
    try {
      await onDownloadReport(siteId, format);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Lokasi PLTS Terdaftar
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manajemen aset PLTS terdistribusi, telemetri harian, dan unduh laporan performa.
          </p>
        </div>
      </div>

      {/* KPI Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Kapasitas</p>
              <p className="text-xl font-bold text-slate-900">{totalKwp.toFixed(1)} kWp</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Operasi Normal</p>
              <p className="text-xl font-bold text-emerald-600">{normalCount} Lokasi</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Perlu Tindakan</p>
              <p className="text-xl font-bold text-amber-600">{actionCount} Lokasi</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Kondisi Kritis</p>
              <p className="text-xl font-bold text-red-600">{criticalCount} Lokasi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama lokasi atau kota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "Semua" },
            { id: "CRITICAL", label: "Kritis" },
            { id: "ACTION", label: "Perlu Tindakan" },
            { id: "NORMAL", label: "Normal" },
            { id: "NO_DATA", label: "Belum Ada Data" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                statusFilter === f.id
                  ? "bg-blue-600 text-white font-semibold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sites Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredSites.map((site) => {
          const isCritical = site.status === "CRITICAL";
          const isAction = site.status === "ACTION";
          const isNormal = site.status === "NORMAL";

          return (
            <div
              key={site.id}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition hover:shadow-sm flex flex-col justify-between"
            >
              {/* Card Top */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3
                      onClick={() => onSelectSite(site.id)}
                      className="text-base font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition flex items-center gap-1.5"
                    >
                      {site.name}
                      <ArrowUpRight className="h-4 w-4 opacity-50" />
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {site.city}, {site.province} • {site.kwp} kWp
                    </p>
                  </div>

                  {/* Status Badge */}
                  {isCritical && (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200/70 px-2.5 py-1 rounded-full shrink-0">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Kritis
                    </span>
                  )}
                  {isAction && (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-2.5 py-1 rounded-full shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Perlu Tindakan
                    </span>
                  )}
                  {isNormal && (
                    <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-2.5 py-1 rounded-full shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Normal
                    </span>
                  )}
                  {!isCritical && !isAction && !isNormal && (
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      Belum Ada Data
                    </span>
                  )}
                </div>

                {/* Specs Pill info */}
                <div className="grid grid-cols-3 gap-2 mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Sistem</span>
                    <span className="font-semibold text-slate-700 capitalize">
                      {site.system_type.replace("_", "-")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Baterai</span>
                    <span className="font-semibold text-slate-700">
                      {site.has_battery ? "Tersedia" : "Tanpa Baterai"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Operator</span>
                    <span className="font-semibold text-slate-700">
                      {site.operator_name || "Petugas Desa"}
                    </span>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400">Aktual / Ekspektasi</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">
                      {site.actual_kwh !== null
                        ? `${site.actual_kwh} / ${site.expected_kwh} kWh`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-400">Performance (PR)</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">
                      {site.performance !== null ? `${(site.performance * 100).toFixed(0)}%` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-400">Potensi Rugi</p>
                    <p className="text-sm font-bold text-red-600 mt-0.5 tabular-nums">
                      {site.loss_idr && site.loss_idr > 0
                        ? `Rp${site.loss_idr.toLocaleString("id-ID")}`
                        : "Rp0"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectSite(site.id)}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Gauge className="h-3.5 w-3.5" />
                  Rincian & Grafik
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={downloadingId === `${site.id}_pdf`}
                    onClick={() => handleDownload(site.id, "pdf")}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <FileText className="h-3 w-3 text-red-500" />
                    PDF
                  </button>
                  <button
                    disabled={downloadingId === `${site.id}_csv`}
                    onClick={() => handleDownload(site.id, "csv")}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <Download className="h-3 w-3 text-emerald-600" />
                    CSV
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSites.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Tidak ada lokasi yang cocok</p>
          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter status.</p>
        </div>
      )}
    </div>
  );
};
