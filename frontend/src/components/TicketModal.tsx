import React, { useState } from "react";
import { Ticket, User } from "../types.ts";
import { X, CheckCircle2, Clock, Wrench, AlertTriangle, ShieldCheck } from "lucide-react";

interface TicketModalProps {
  ticket: Ticket | null;
  currentUser: User | null;
  onClose: () => void;
  onApprove: (ticketId: string) => Promise<void>;
  onPostpone: (ticketId: string, note: string) => Promise<void>;
  onMarkDone: (ticketId: string, note: string) => Promise<void>;
  isLoading: boolean;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  ticket,
  currentUser,
  onClose,
  onApprove,
  onPostpone,
  onMarkDone,
  isLoading,
}) => {
  const [techNote, setTechNote] = useState("Pemeriksaan string inverter selesai, konektor MC4 diganti, dan inverter beroperasi normal.");
  const [postponeNote, setPostponeNote] = useState("");
  const [isPostponing, setIsPostponing] = useState(false);

  if (!ticket) return null;

  const costFormatted = ticket.estimated_cost_idr
    ? `Rp${ticket.estimated_cost_idr.toLocaleString("id-ID")}`
    : "Rp150.000";

  const isManager = currentUser?.role === "manager" || currentUser?.role === "admin";
  const isTechnician = currentUser?.role === "technician" || currentUser?.role === "admin";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Tiket {ticket.code} — {ticket.site_name}
              </h3>
              <p className="text-xs text-slate-500">
                Pemeriksaan & Tindakan Lapangan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-sm">
          {/* Status Alert Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-900">Status Tiket:</span>
            <span className="px-2.5 py-1 rounded-full font-bold bg-white text-blue-700 border border-blue-200 shadow-2xs">
              {ticket.status}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block font-medium">Estimasi Biaya</span>
              <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                {costFormatted}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block font-medium">Prioritas</span>
              <span className="text-sm font-bold text-slate-900 capitalize mt-1 block flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                {ticket.priority}
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Penyebab & Deskripsi Masalah:
            </span>
            <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
              {ticket.reason}
            </p>
          </div>

          {/* Safety Playbook Notification */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Prosedur keselamatan darat aktif: Teknisi diwajibkan melakukan pemeriksaan saklar AC/DC dan pembacaan kode inverter sebelum menyentuh komponen fisik.
            </span>
          </div>

          {/* Manager Action Form */}
          {ticket.status === "AWAITING_APPROVAL" && isManager && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    await onApprove(ticket.id);
                    onClose();
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Setujui Kunjungan ({costFormatted})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPostponing(!isPostponing)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition"
                >
                  Tunda
                </button>
              </div>

              {isPostponing && (
                <div className="space-y-2 pt-2">
                  <input
                    type="text"
                    value={postponeNote}
                    onChange={(e) => setPostponeNote(e.target.value)}
                    placeholder="Alasan penundaan jadwal..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-blue-500"
                  />
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={async () => {
                      await onPostpone(ticket.id, postponeNote || "Menunggu koordinasi teknis");
                      onClose();
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    Konfirmasi Penundaan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Technician Action Form */}
          {(ticket.status === "SCHEDULED" || ticket.status === "AWAITING_APPROVAL") && isTechnician && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-600 block">
                Catatan Hasil Pekerjaan Lapangan:
              </label>
              <textarea
                rows={2}
                value={techNote}
                onChange={(e) => setTechNote(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-blue-500 text-slate-800"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={async () => {
                  await onMarkDone(ticket.id, techNote);
                  onClose();
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Catat Pekerjaan Selesai (Mulai Pemantauan 3 Hari)</span>
              </button>
            </div>
          )}

          {ticket.status === "DONE_BY_TECH" && (
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600 shrink-0" />
              <span>
                Pekerjaan teknisi selesai. Sistem dalam masa verifikasi otomatis (3 hari berturut-turut $\ge 90\%$ target) untuk mencapai status Selesai & Pulih.
              </span>
            </div>
          )}

          {ticket.status === "RESOLVED" && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Tiket resmi SELESAI & PULIH. Produksi energi telah memenuhi ambang batas 90% selama 3 hari berturut-turut.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
