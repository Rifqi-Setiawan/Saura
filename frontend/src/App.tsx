import React, { useEffect, useState } from "react";
import { api, setToken } from "./api.ts";
import { SiteDetail, SiteSummary, Ticket, User } from "./types.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { KpiCards } from "./components/KpiCards.tsx";
import { PriorityTable } from "./components/PriorityTable.tsx";
import { TelemetryChartCard } from "./components/TelemetryChartCard.tsx";
import { LocationMapCard } from "./components/LocationMapCard.tsx";
import { ApprovalCard } from "./components/ApprovalCard.tsx";
import { SiteDetailModal } from "./components/SiteDetailModal.tsx";
import { TicketModal } from "./components/TicketModal.tsx";
import { SitesView } from "./components/SitesView.tsx";
import { TicketsView } from "./components/TicketsView.tsx";
import { ReportsView } from "./components/ReportsView.tsx";
import {
  Calendar,
  ChevronDown,
  Upload,
  RefreshCw,
  FastForward,
  AlertCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [hudaDetail, setHudaDetail] = useState<SiteDetail | null>(null);
  const [selectedSite, setSelectedSite] = useState<SiteDetail | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ringkasan");
  const [simDate, setSimDate] = useState<string>("2026-10-26");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize and authenticate demo session
  const initAuth = async (email = "rina@saura.id") => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.login(email, "password123");
      setCurrentUser(res.user);
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengautentikasi pengguna";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [sitesData, ticketsData, simStatus] = await Promise.all([
        api.listSites(),
        api.listTickets(),
        api.getSimStatus().catch(() => ({ current_date: "2026-10-26", cutoff_passed: false })),
      ]);

      setSites(sitesData);
      setTickets(ticketsData);
      setSimDate(simStatus.current_date || "2026-10-26");

      // Load MA Nurul Huda telemetry for the line chart
      const huda = sitesData.find((s) => s.name.includes("Nurul Huda")) || sitesData[0];
      if (huda) {
        const detail = await api.getSite(huda.id);
        setHudaDetail(detail);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data dashboard";
      setError(msg);
    }
  };

  useEffect(() => {
    initAuth("rina@saura.id");
  }, []);

  const handleSwitchUser = async (email: string) => {
    setToken("");
    await initAuth(email);
  };

  const handleSelectSite = async (siteId: string) => {
    try {
      setIsLoading(true);
      const detail = await api.getSite(siteId);
      setSelectedSite(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat rincian situs";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTicket = async (ticketId: string) => {
    try {
      setIsLoading(true);
      await api.approveTicket(ticketId);
      await loadDashboardData();
      setActiveTicket(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyetujui tiket";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostponeTicket = async (ticketId: string, note: string) => {
    try {
      setIsLoading(true);
      await api.postponeTicket(ticketId, note);
      await loadDashboardData();
      setActiveTicket(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menunda tiket";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkTicketDone = async (ticketId: string, note: string) => {
    try {
      setIsLoading(true);
      await api.markTicketDone(ticketId, note);
      await loadDashboardData();
      setActiveTicket(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mencatat penyelesaian tiket";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvanceTo30 = async () => {
    try {
      setIsLoading(true);
      await api.advanceSim("2026-10-30");
      await loadDashboardData();
      if (selectedSite) {
        const updated = await api.getSite(selectedSite.id);
        setSelectedSite(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memajukan simulasi";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSim = async () => {
    try {
      setIsLoading(true);
      await api.seedSim("2026-10-26");
      await loadDashboardData();
      setSelectedSite(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal me-reset simulasi";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenApprovalModal = () => {
    const pending = tickets.find((t) => t.status === "AWAITING_APPROVAL") || tickets[0];
    if (pending) {
      setActiveTicket(pending);
    } else {
      alert("Tidak ada tiket yang menunggu persetujuan saat ini.");
    }
  };

  const formatHeaderDate = (dateStr: string) => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const year = parts[0];
      return `${day} ${months[monthIdx] || "Oktober"} ${year}`;
    }
    return dateStr;
  };

  const getHeaderInfo = () => {
    switch (activeTab) {
      case "lokasi":
        return {
          title: "Lokasi PLTS Terdaftar",
          subtitle: "Daftar instalasi pembangkit surya, konfigurasi teknis, dan audit telemetri.",
        };
      case "tiket":
        return {
          title: "Tiket Pemeliharaan & Operasi",
          subtitle: "Persetujuan biaya kunjungan teknisi, jadwal penugasan lapangan, dan transparansi O&M.",
        };
      case "laporan":
        return {
          title: "Laporan Mingguan & Audit Finansial",
          subtitle: "Evaluasi mingguan produksi kWh terhadap iradiasi cuaca historis dan kehilangan pendapatan.",
        };
      case "pengaturan":
        return {
          title: "Pengaturan Sistem & Simulasi",
          subtitle: "Parameter operasional, jam simulasi, dan integrasi bot pemantauan.",
        };
      case "ringkasan":
      default:
        return {
          title: "Ringkasan lokasi",
          subtitle: "Prioritaskan lokasi yang perlu bantuan.",
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans antialiased">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="px-8 pt-7 pb-6 bg-[#F8FAFC]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Title & Subtitle */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {headerInfo.title}
                </h1>
                <span className="bg-blue-50 text-blue-600 border border-blue-200/80 text-xs font-semibold px-2.5 py-0.5 rounded-full select-none">
                  Data simulasi
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {headerInfo.subtitle}
              </p>
            </div>

            {/* Right Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Simulation Quick Controls */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={handleAdvanceTo30}
                  disabled={isLoading}
                  title="Majukan waktu simulasi ke 30 Okt (3 hari pemulihan)"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <FastForward className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Majukan 30 Okt</span>
                </button>
                <div className="w-[1px] h-4 bg-slate-200"></div>
                <button
                  type="button"
                  onClick={handleResetSim}
                  disabled={isLoading}
                  title="Reset simulasi ke 26 Okt"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Date Dropdown */}
              <div className="bg-white border border-slate-200 text-slate-700 font-medium px-3.5 py-2 rounded-xl text-xs shadow-2xs flex items-center gap-2 select-none">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{formatHeaderDate(simDate)}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
              </div>

              {/* Action Button: Impor CSV */}
              <button
                type="button"
                onClick={() => alert("Fitur Impor CSV: unggah berkas telemetri harian untuk analisis offline.")}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3.5 py-2 rounded-xl text-xs shadow-2xs flex items-center gap-2 transition cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-slate-500" />
                <span>Impor CSV</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content Body */}
        <main className="px-8 pb-10 space-y-6 flex-1">
          {/* Error notification banner if any */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => initAuth(currentUser?.email || "rina@saura.id")}
                className="underline font-semibold hover:text-red-900 cursor-pointer"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* Tab 1: Ringkasan Lokasi (Home Mockup View) */}
          {activeTab === "ringkasan" && (
            <div className="space-y-6">
              {/* 3. Top 4 KPI Status Cards */}
              <KpiCards sites={sites} />

              {/* 4. Priority Table Card */}
              <PriorityTable
                sites={sites}
                tickets={tickets}
                onSelectSite={handleSelectSite}
                onOpenApprovalModal={handleOpenApprovalModal}
              />

              {/* 5. Bottom Split Section (Chart on Left, Map & Approval on Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left: MA Nurul Huda 7-Day Performance Line Chart */}
                <div className="lg:col-span-7 flex flex-col">
                  <TelemetryChartCard
                    siteDetail={hudaDetail}
                    onOpenDetailModal={() => {
                      const huda = sites.find((s) => s.name.includes("Nurul Huda"));
                      if (huda) handleSelectSite(huda.id);
                    }}
                  />
                </div>

                {/* Right: Sebaran Lokasi & Persetujuan Menunggu */}
                <div className="lg:col-span-5 flex flex-col gap-4 justify-between">
                  <LocationMapCard
                    sites={sites}
                    onSelectSite={handleSelectSite}
                  />
                  <ApprovalCard
                    tickets={tickets}
                    currentUser={currentUser}
                    onOpenApprovalModal={handleOpenApprovalModal}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Lokasi PLTS */}
          {activeTab === "lokasi" && (
            <SitesView
              sites={sites}
              onSelectSite={handleSelectSite}
              onDownloadReport={api.downloadWeeklyReport}
            />
          )}

          {/* Tab 3: Tiket */}
          {activeTab === "tiket" && (
            <TicketsView
              tickets={tickets}
              currentUser={currentUser}
              sites={sites}
              onSelectTicket={setActiveTicket}
              onRefreshTickets={loadDashboardData}
            />
          )}

          {/* Tab 4: Laporan */}
          {activeTab === "laporan" && (
            <ReportsView onDownloadReport={api.downloadWeeklyReport} />
          )}

          {/* Tab 5: Pengaturan */}
          {activeTab === "pengaturan" && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs max-w-2xl space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">Pengaturan Sistem & Operasional</h3>
                <p className="text-xs text-slate-500 mt-0.5">Konfigurasi akun, baseline kalkulasi, dan sinkronisasi bot.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-800">Akun Pengguna Aktif</p>
                      <p className="text-slate-400">{currentUser?.name} ({currentUser?.email}) • Role: {currentUser?.role}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-200">
                    Terautentikasi JWT
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-bold text-slate-800">Tarif Listrik Dasar</p>
                      <p className="text-slate-400">Digunakan untuk menghitung estimasi kerugian finansial per kWh</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    Rp1.500 / kWh
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="font-bold text-slate-800">Jam Simulasi Sistem (Sim Clock)</p>
                      <p className="text-slate-400">Tanggal evaluasi data telemetri saat ini</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    {simDate}
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <SiteDetailModal
        site={selectedSite}
        onClose={() => setSelectedSite(null)}
      />

      <TicketModal
        ticket={activeTicket}
        currentUser={currentUser}
        onClose={() => setActiveTicket(null)}
        onApprove={handleApproveTicket}
        onPostpone={handlePostponeTicket}
        onMarkDone={handleMarkTicketDone}
        isLoading={isLoading}
      />
    </div>
  );
};
