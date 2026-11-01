import React from "react";
import { SiteSummary, Ticket } from "../types.ts";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface PriorityTableProps {
  sites: SiteSummary[];
  tickets: Ticket[];
  onSelectSite: (siteId: string) => void;
  onOpenApprovalModal?: () => void;
}

export const PriorityTable: React.FC<PriorityTableProps> = ({
  sites,
  tickets,
  onSelectSite,
  onOpenApprovalModal,
}) => {
  // Sort priority: CRITICAL first, then ACTION, then NO_DATA, then NORMAL
  const sortedSites = [...sites].sort((a, b) => {
    const order = { CRITICAL: 0, ACTION: 1, NO_DATA: 2, NORMAL: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200/60">
            <AlertCircle className="h-3.5 w-3.5" />
            Kritis
          </span>
        );
      case "ACTION":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
            <AlertTriangle className="h-3.5 w-3.5" />
            Perlu tindakan
          </span>
        );
      case "NORMAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Normal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200/60">
            <Clock className="h-3.5 w-3.5" />
            Belum ada data
          </span>
        );
    }
  };

  const getActionButton = (site: SiteSummary) => {
    const pendingTicket = tickets.find(
      (t) => t.site_id === site.id && t.status === "AWAITING_APPROVAL"
    );
    const scheduledTicket = tickets.find(
      (t) => t.site_id === site.id && (t.status === "SCHEDULED" || t.status === "DONE_BY_TECH")
    );

    if (site.status === "CRITICAL" || scheduledTicket) {
      return (
        <button
          onClick={() => onSelectSite(site.id)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2 rounded-full transition shadow-2xs"
        >
          Tiket teknisi
        </button>
      );
    }

    if (pendingTicket || site.name.includes("Nurul Huda")) {
      return (
        <button
          onClick={() => {
            if (onOpenApprovalModal) onOpenApprovalModal();
            else onSelectSite(site.id);
          }}
          className="bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 font-medium text-xs px-4 py-2 rounded-full transition"
        >
          Menunggu persetujuan
        </button>
      );
    }

    if (site.status === "NORMAL") {
      return (
        <button
          onClick={() => onSelectSite(site.id)}
          className="border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs px-4 py-2 rounded-full transition"
        >
          Pantau rutin
        </button>
      );
    }

    // Belum ada data
    return (
      <button
        onClick={() => alert(`Pengingat konfirmasi foto otomatis dikirim ke operator ${site.name}.`)}
        className="border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs px-4 py-2 rounded-full transition"
      >
        Ingatkan operator
      </button>
    );
  };

  const formatKwhDisplay = (site: SiteSummary) => {
    if (site.status === "NO_DATA" || site.actual_kwh === null) {
      return "—";
    }
    const actStr = Number.isInteger(site.actual_kwh)
      ? `${site.actual_kwh}`
      : site.actual_kwh.toFixed(1).replace(".", ",");
    const expStr = site.expected_kwh
      ? `${Math.round(site.expected_kwh)}`
      : `${Math.round(site.kwp * 4.8)}`;
    return `${actStr} / ${expStr} kWh`;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Prioritas hari ini
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 tracking-wider">
              <th className="pb-3 pr-4 font-medium">Lokasi</th>
              <th className="pb-3 px-4 font-medium">Status</th>
              <th className="pb-3 px-4 font-medium">Produksi / Aktual / perkiraan</th>
              <th className="pb-3 pl-4 text-right font-medium">Tindak lanjut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 text-sm">
            {sortedSites.map((site) => (
              <tr key={site.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-4 pr-4">
                  <button
                    onClick={() => onSelectSite(site.id)}
                    className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                  >
                    {site.name}
                  </button>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {site.city}, {site.province} • {site.kwp} kWp
                  </p>
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  {getStatusBadge(site.status)}
                </td>
                <td className="py-4 px-4 font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                  {formatKwhDisplay(site)}
                </td>
                <td className="py-4 pl-4 text-right whitespace-nowrap">
                  {getActionButton(site)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
