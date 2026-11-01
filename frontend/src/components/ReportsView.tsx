import React, { useEffect, useState } from "react";
import { WeeklyReport } from "../types.ts";
import { api } from "../api.ts";
import {
  BarChart3,
  Download,
  FileText,
  Calendar,
  Zap,
  TrendingDown,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface ReportsViewProps {
  onDownloadReport: (siteId: string, format: "pdf" | "csv") => Promise<void>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onDownloadReport }) => {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.getReportsOverview();
      setReports(data);
      if (data.length > 0 && !selectedSiteId) {
        setSelectedSiteId(data[0].site_id);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat laporan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const totalActual = reports.reduce((acc, r) => acc + (r.totals?.actual_kwh || 0), 0);
  const totalExpected = reports.reduce((acc, r) => acc + (r.totals?.expected_kwh || 0), 0);
  const totalLoss = reports.reduce((acc, r) => acc + (r.totals?.loss_idr || 0), 0);
  const overallPr = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

  const handleDownload = async (siteId: string, format: "pdf" | "csv") => {
    setDownloadingId(`${siteId}_${format}`);
    try {
      await onDownloadReport(siteId, format);
    } finally {
      setDownloadingId(null);
    }
  };

  const selectedReport = reports.find((r) => r.site_id === selectedSiteId) || reports[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Laporan Kinerja & Audit Finansial
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Evaluasi mingguan produksi kWh terhadap iradiasi cuaca historis, gap deviasi, dan kehilangan pendapatan.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Muat Ulang
        </button>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Produksi Aktual</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {totalActual.toLocaleString("id-ID")} kWh
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Potensi Sesuai Cuaca</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {totalExpected.toLocaleString("id-ID")} kWh
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Kerugian Finansial</p>
              <p className="text-xl font-bold text-red-600 font-mono">
                Rp{totalLoss.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Rasio Kinerja Gabungan</p>
              <p className="text-xl font-bold text-emerald-600 tabular-nums">
                {overallPr.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reports Table by Site */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Ringkasan Audit Mingguan per Lokasi PLTS
          </h3>
          <span className="text-xs font-medium text-slate-400">
            {reports[0]?.period || "Periode 7 Hari Terakhir"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Lokasi PLTS</th>
                <th className="py-3 px-3">Kapasitas</th>
                <th className="py-3 px-3">Produksi Aktual</th>
                <th className="py-3 px-3">Ekspektasi Cuaca</th>
                <th className="py-3 px-3">Gap Deviasi</th>
                <th className="py-3 px-3">Kerugian Finansial</th>
                <th className="py-3 px-3 text-right">Unduh Berkas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {reports.map((r) => {
                const isSelected = selectedSiteId === r.site_id;
                return (
                  <tr
                    key={r.site_id}
                    onClick={() => setSelectedSiteId(r.site_id)}
                    className={`hover:bg-slate-50 transition cursor-pointer ${
                      isSelected ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-slate-900">{r.site_name}</p>
                      <p className="text-xs text-slate-400">{r.period}</p>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700">
                      {r.kwp} kWp
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900 tabular-nums">
                      {r.totals?.actual_kwh || 0} kWh
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-600 tabular-nums">
                      {r.totals?.expected_kwh || 0} kWh
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md tabular-nums ${
                          (r.totals?.gap_kwh || 0) > 0
                            ? "bg-red-50 text-red-600 border border-red-200/60"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                        }`}
                      >
                        {(r.totals?.gap_kwh || 0) > 0 ? `-${r.totals.gap_kwh} kWh` : "Optimal"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-red-600">
                      {(r.totals?.loss_idr || 0) > 0
                        ? `Rp${r.totals.loss_idr.toLocaleString("id-ID")}`
                        : "Rp0"}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={downloadingId === `${r.site_id}_pdf`}
                          onClick={() => handleDownload(r.site_id, "pdf")}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <FileText className="h-3 w-3 text-red-500" />
                          PDF
                        </button>
                        <button
                          disabled={downloadingId === `${r.site_id}_csv`}
                          onClick={() => handleDownload(r.site_id, "csv")}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Download className="h-3 w-3 text-emerald-600" />
                          CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Site Day-by-Day Detail Card */}
      {selectedReport && selectedReport.days && selectedReport.days.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Rincian Telemetri Harian: {selectedReport.site_name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan data sensor aktual terhadap estimasi model fisika cuaca Open-Meteo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(selectedReport.site_id, "pdf")}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <FileText className="h-3.5 w-3.5" />
                Unduh PDF ({selectedReport.site_name})
              </button>
              <button
                onClick={() => handleDownload(selectedReport.site_id, "csv")}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                Ekspor CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Produksi Aktual</th>
                  <th className="py-2.5 px-3">Ekspektasi Cuaca</th>
                  <th className="py-2.5 px-3">Gap Energi</th>
                  <th className="py-2.5 px-3">Performance Ratio</th>
                  <th className="py-2.5 px-3">Estimasi Kerugian</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedReport.days.map((day) => (
                  <tr key={day.date} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {day.date}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 tabular-nums">
                      {day.actual_kwh !== null ? `${day.actual_kwh} kWh` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 tabular-nums">
                      {day.expected_kwh !== null ? `${day.expected_kwh} kWh` : "—"}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums">
                      {day.gap_kwh !== null && day.gap_kwh > 0 ? (
                        <span className="text-red-600 font-semibold">-{day.gap_kwh} kWh</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">0 kWh</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700 tabular-nums">
                      {day.performance !== null ? `${(day.performance * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                      {day.loss_idr && day.loss_idr > 0 ? `Rp${day.loss_idr.toLocaleString("id-ID")}` : "Rp0"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          day.status === "CRITICAL"
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : day.status === "ACTION"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : day.status === "NORMAL"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {day.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reports.length === 0 && !loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Belum ada laporan tersedia</p>
          <p className="text-xs text-slate-400 mt-1">Data telemetri akan diolah secara berkala untuk menyusun audit mingguan.</p>
        </div>
      )}
    </div>
  );
};
