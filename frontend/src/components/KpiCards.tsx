import React from "react";
import { SiteSummary } from "../types.ts";
import { Building2, AlertCircle, AlertTriangle, Clock } from "lucide-react";

interface KpiCardsProps {
  sites: SiteSummary[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({ sites }) => {
  const criticalCount = sites.filter((s) => s.status === "CRITICAL").length;
  const actionCount = sites.filter((s) => s.status === "ACTION").length;
  const noDataCount = sites.filter((s) => s.status === "NO_DATA").length;
  const totalCount = sites.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Terdaftar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            {totalCount} lokasi
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Terdaftar</p>
        </div>
      </div>

      {/* 2. Kritis */}
      <div className="bg-[#FEF2F2] border border-red-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="w-10 h-10 rounded-xl bg-red-100/80 text-red-600 flex items-center justify-center">
          <AlertCircle className="h-5 w-5 fill-red-100 stroke-red-600" />
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-red-600 tracking-tight">
            {criticalCount}
          </p>
          <p className="text-xs font-medium text-red-700/80 mt-0.5">Kritis</p>
        </div>
      </div>

      {/* 3. Perlu Tindakan */}
      <div className="bg-[#FFFBEB] border border-amber-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 fill-amber-100 stroke-amber-600" />
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-amber-600 tracking-tight">
            {actionCount}
          </p>
          <p className="text-xs font-medium text-amber-700/80 mt-0.5">Perlu tindakan</p>
        </div>
      </div>

      {/* 4. Belum Ada Data */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
          <Clock className="h-5 w-5" />
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-slate-800 tracking-tight">
            {noDataCount}
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Belum ada data</p>
        </div>
      </div>
    </div>
  );
};
