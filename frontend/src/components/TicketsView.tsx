import React, { useState } from "react";
import { Ticket, User, SiteSummary } from "../types.ts";
import { api } from "../api.ts";
import {
  Inbox,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Wrench,
  Search,
  UserCheck,
  ChevronRight,
  X,
} from "lucide-react";

interface TicketsViewProps {
  tickets: Ticket[];
  currentUser: User | null;
  sites: SiteSummary[];
  onSelectTicket: (ticket: Ticket) => void;
  onRefreshTickets: () => Promise<void>;
}

export const TicketsView: React.FC<TicketsViewProps> = ({
  tickets,
  currentUser,
  sites,
  onSelectTicket,
  onRefreshTickets,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [siteId, setSiteId] = useState(sites[0]?.id || "");
  const [reason, setReason] = useState("");
  const [cause, setCause] = useState("");
  const [priority, setPriority] = useState<"normal" | "critical">("normal");
  const [cost, setCost] = useState("150000");

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.reason.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "AWAITING_APPROVAL" && t.status === "AWAITING_APPROVAL") ||
      (statusFilter === "SCHEDULED" && t.status === "SCHEDULED") ||
      (statusFilter === "DONE" && (t.status === "DONE_BY_TECH" || t.status === "RESOLVED")) ||
      (statusFilter === "POSTPONED" && t.status === "POSTPONED");

    return matchesSearch && matchesStatus;
  });

  const awaitingCount = tickets.filter((t) => t.status === "AWAITING_APPROVAL").length;
  const scheduledCount = tickets.filter((t) => t.status === "SCHEDULED").length;
  const doneCount = tickets.filter((t) => t.status === "DONE_BY_TECH" || t.status === "RESOLVED").length;
  const totalCost = tickets.reduce((acc, t) => acc + (t.estimated_cost_idr || 0), 0);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Alasan pembuatan tiket wajib diisi");
      return;
    }

    try {
      setSubmitting(true);
      await api.createTicket({
        site_id: siteId || sites[0]?.id,
        reason: reason.trim(),
        cause: cause.trim() || undefined,
        priority,
        estimated_cost_idr: parseInt(cost, 10) || 150000,
      });

      setIsCreateOpen(false);
      setReason("");
      setCause("");
      await onRefreshTickets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat tiket";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickApprove = async (ticketId: string) => {
    try {
      await api.approveTicket(ticketId);
      await onRefreshTickets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyetujui tiket";
      alert(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Tiket Pemeliharaan & Operasi
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola izin kunjungan teknisi, jadwal penugasan lapangan, dan transparansi biaya perbaikan.
          </p>
        </div>

        {currentUser?.role === "manager" && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Buat Tiket Baru
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Biaya O&M</p>
              <p className="text-xl font-bold text-slate-900 font-mono">
                Rp{totalCost.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Menunggu Persetujuan</p>
              <p className="text-xl font-bold text-amber-600">{awaitingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Dijadwalkan</p>
              <p className="text-xl font-bold text-blue-600">{scheduledCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pekerjaan Selesai</p>
              <p className="text-xl font-bold text-emerald-600">{doneCount}</p>
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
            placeholder="Cari kode tiket, lokasi, atau alasan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "Semua" },
            { id: "AWAITING_APPROVAL", label: `Menunggu Persetujuan (${awaitingCount})` },
            { id: "SCHEDULED", label: `Dijadwalkan (${scheduledCount})` },
            { id: "DONE", label: `Selesai (${doneCount})` },
            { id: "POSTPONED", label: "Ditunda" },
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

      {/* Ticket Cards List */}
      <div className="space-y-4">
        {filteredTickets.map((ticket) => {
          const isAwaiting = ticket.status === "AWAITING_APPROVAL";
          const isScheduled = ticket.status === "SCHEDULED";
          const isDone = ticket.status === "DONE_BY_TECH" || ticket.status === "RESOLVED";
          const isPostponed = ticket.status === "POSTPONED";

          return (
            <div
              key={ticket.id}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition hover:shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {ticket.code}
                    </span>

                    {/* Status Badge */}
                    {isAwaiting && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-2.5 py-1 rounded-full">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Menunggu Persetujuan
                      </span>
                    )}
                    {isScheduled && (
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-2.5 py-1 rounded-full">
                        <Clock className="h-3.5 w-3.5" />
                        Kunjungan Dijadwalkan
                      </span>
                    )}
                    {isDone && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Pekerjaan Selesai
                      </span>
                    )}
                    {isPostponed && (
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        Ditunda
                      </span>
                    )}

                    {ticket.priority === "critical" && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                        Prioritas Kritis
                      </span>
                    )}

                    <span className="text-xs text-slate-400">
                      Dibuat: {ticket.created_at.slice(0, 10)}
                    </span>
                  </div>

                  {/* Title & Reason */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {ticket.site_name}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {ticket.reason}
                    </p>
                    {ticket.cause && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Dugaan akar masalah: {ticket.cause}
                      </p>
                    )}
                  </div>

                  {/* Meta details */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                      <span>Pelaporan Lapangan: <strong className="text-slate-700">Mobile / Telegram Bot</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-slate-400" />
                      <span>Estimasi Biaya: <strong className="text-slate-900 font-mono font-bold">Rp{(ticket.estimated_cost_idr || 0).toLocaleString("id-ID")}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {currentUser?.role === "manager" && isAwaiting && (
                    <button
                      onClick={() => handleQuickApprove(ticket.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
                    >
                      Setujui Kunjungan
                    </button>
                  )}

                  <button
                    onClick={() => onSelectTicket(ticket)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    Rincian & Timeline
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTickets.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada tiket ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter atau tambahkan tiket pemeliharaan baru.</p>
          </div>
        )}
      </div>

      {/* Modal Buat Tiket Baru */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Buat Tiket Pemeliharaan Baru</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ajukan penugasan teknisi dan persetujuan biaya operasional.</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Pilih Lokasi PLTS
                </label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city}) • {s.kwp} kWp
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Alasan / Gejala Anomali *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Produksi drop 35% selama 3 hari berturut-turut, inverter berkedip merah..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Dugaan Akar Masalah Teknis
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kotoran tebal pada modul / sambungan MC4 longgar"
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tingkat Prioritas
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "normal" | "critical")}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="critical">Kritis</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Estimasi Biaya (Rp)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Buat Tiket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
