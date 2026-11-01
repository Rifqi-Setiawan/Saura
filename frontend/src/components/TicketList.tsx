import React, { useState } from "react";
import { Ticket, TicketStatus, User } from "../types.ts";
import { CheckCircle2, Clock, Wrench, Check } from "lucide-react";

interface TicketListProps {
  tickets: Ticket[];
  currentUser: User | null;
  onApprove: (ticketId: string) => Promise<void>;
  onPostpone: (ticketId: string, note: string) => Promise<void>;
  onMarkDone: (ticketId: string, note: string) => Promise<void>;
  isLoading: boolean;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  currentUser,
  onApprove,
  onPostpone,
  onMarkDone,
  isLoading,
}) => {
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [modalType, setModalType] = useState<"done" | "postpone" | null>(null);

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "AWAITING_APPROVAL":
        return (
          <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium inline-flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Menunggu Persetujuan
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium inline-flex items-center">
            <Wrench className="h-3 w-3 mr-1" />
            Jadwal Teknisi
          </span>
        );
      case "DONE_BY_TECH":
        return (
          <span className="px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium inline-flex items-center">
            <Check className="h-3 w-3 mr-1" />
            Kunjungan Selesai (Pemantauan Pulih)
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium inline-flex items-center">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Selesai & Pulih
          </span>
        );
      case "POSTPONED":
        return (
          <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium inline-flex items-center">
            Ditunda
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs">
            {status}
          </span>
        );
    }
  };

  const handleOpenModal = (ticketId: string, type: "done" | "postpone") => {
    setActiveTicketId(ticketId);
    setModalType(type);
    setActionNote("");
  };

  const handleSubmitModal = async () => {
    if (!activeTicketId) return;
    if (modalType === "done") {
      await onMarkDone(activeTicketId, actionNote || "Inverter MCB tripped and re-engaged, panel cleaned.");
    } else if (modalType === "postpone") {
      await onPostpone(activeTicketId, actionNote || "Jadwal ditunda menunggu konfirmasi operasional.");
    }
    setActiveTicketId(null);
    setModalType(null);
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">
            Tiket Tindakan Perbaikan
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar eskalasi otomatis dari triage cerdas & verifikasi pemulihan
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700 font-medium">
          {tickets.length} Tiket
        </span>
      </div>

      {tickets.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          Tidak ada tiket tindakan aktif saat ini.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          {tickets.map((t) => (
            <div key={t.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    {t.code}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    {t.site_name}
                  </span>
                  {getStatusBadge(t.status)}
                </div>
                <p className="text-xs text-slate-300">
                  <span className="text-slate-400">Penyebab dugaan:</span>{" "}
                  <strong>{t.cause || t.reason}</strong>
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-0.5">
                  <span>
                    Teknisi: <strong className="text-slate-300">{t.technician_name || "Belum ditugaskan"}</strong>
                  </span>
                  <span>
                    Estimasi Biaya:{" "}
                    <strong className="text-slate-200 tabular-nums">
                      {t.estimated_cost_idr ? `Rp${t.estimated_cost_idr.toLocaleString("id-ID")}` : "Rp0"}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {/* Manager Approve / Postpone */}
                {currentUser?.role === "manager" && t.status === "AWAITING_APPROVAL" && (
                  <>
                    <button
                      onClick={() => handleOpenModal(t.id, "postpone")}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
                    >
                      Tunda
                    </button>
                    <button
                      onClick={() => onApprove(t.id)}
                      disabled={isLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors flex items-center space-x-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Setujui Kunjungan</span>
                    </button>
                  </>
                )}

                {/* Technician Mark Done */}
                {currentUser?.role === "technician" && t.status === "SCHEDULED" && (
                  <button
                    onClick={() => handleOpenModal(t.id, "done")}
                    disabled={isLoading}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors flex items-center space-x-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Tandai Selesai Kunjungan</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Done / Postpone */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-md rounded-xl p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-white">
              {modalType === "done" ? "Konfirmasi Kunjungan Teknisi Selesai" : "Tunda Tiket Tindakan"}
            </h4>
            <p className="text-xs text-slate-400">
              {modalType === "done"
                ? "Masukkan catatan perbaikan di lapangan (misal: pengetesan MCB, pembersihan debu panel, penggantian fuse)."
                : "Masukkan alasan penundaan jadwal tindakan perbaikan."}
            </p>
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder={
                modalType === "done"
                  ? "Contoh: MCB inverter di-reset, string 2 dicek normal, panel dibersihkan."
                  : "Contoh: Menunggu ketersediaan suku cadang."
              }
              rows={3}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setModalType(null)}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitModal}
                disabled={isLoading}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
              >
                Simpan & Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
