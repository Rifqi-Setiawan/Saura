import React from "react";
import { Ticket, User } from "../types.ts";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

interface ApprovalCardProps {
  tickets: Ticket[];
  currentUser: User | null;
  onOpenApprovalModal: () => void;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  tickets,
  currentUser: _currentUser,
  onOpenApprovalModal,
}) => {
  const pendingTickets = tickets.filter(
    (t) => t.status === "AWAITING_APPROVAL"
  );
  const pendingCount = pendingTickets.length;
  const targetTicket = pendingTickets[0] || tickets.find((t) => t.code === "SA-024") || tickets[0];

  const cost = targetTicket?.estimated_cost_idr || 150000;
  const costFormatted = `Rp${cost.toLocaleString("id-ID")}`;

  return (
    <div className="bg-gradient-to-br from-blue-50/70 to-white border border-blue-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header with Icon */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 fill-amber-100 stroke-amber-600" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">
            {pendingCount > 0
              ? `${pendingCount} persetujuan menunggu`
              : "Semua persetujuan selesai"}
          </h4>
        </div>

        {/* Details */}
        <p className="text-xs font-semibold text-slate-700 mt-1">
          {targetTicket ? `Kunjungan ${targetTicket.site_name}` : "Kunjungan MA Nurul Huda"}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
          {targetTicket?.reason || "Pemeriksaan string inverter & konektor MC4"}
        </p>

        {/* Large Monetary Cost */}
        <div className="mt-3">
          <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {costFormatted}
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4">
        {pendingCount > 0 ? (
          <button
            onClick={onOpenApprovalModal}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Tinjau persetujuan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="w-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Persetujuan biaya disetujui</span>
          </div>
        )}
      </div>
    </div>
  );
};
