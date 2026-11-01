import React, { useEffect, useState } from "react";
import { api, setToken } from "./api.ts";
import { SiteDetail, SiteSummary, Ticket, User } from "./types.ts";
import { Navbar } from "./components/Navbar.tsx";
import { SiteCard } from "./components/SiteCard.tsx";
import { SiteDetailModal } from "./components/SiteDetailModal.tsx";
import { TicketList } from "./components/TicketList.tsx";
import { SimulationBar } from "./components/SimulationBar.tsx";
import { AlertCircle, RefreshCw } from "lucide-react";

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [simDate, setSimDate] = useState<string>("2026-10-26");
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const initAuth = async (email = "rina@saura.id") => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.login(email, "password123");
      setCurrentUser(res.user);
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal inisialisasi sesi";
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
        api.getSimStatus(),
      ]);
      setSites(sitesData);
      setTickets(ticketsData);
      setSimDate(simStatus.current_date);
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
      const detail = await api.getSite(siteId);
      setSelectedSite(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuka rincian situs";
      alert(msg);
    }
  };

  const handleApproveTicket = async (ticketId: string) => {
    try {
      setIsLoading(true);
      await api.approveTicket(ticketId);
      await loadDashboardData();
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyelesaikan tiket";
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

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      <Navbar
        currentUser={currentUser}
        simDate={simDate}
        onSwitchUser={handleSwitchUser}
        onResetSim={handleResetSim}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error notification banner if any */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => initAuth(currentUser?.email || "rina@saura.id")}
              className="underline hover:text-white"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Simulation Scenario Bar */}
        <SimulationBar
          simDate={simDate}
          onAdvanceTo30={handleAdvanceTo30}
          isLoading={isLoading}
        />

        {/* Sites Portfolio Overview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Portofolio PLTS ({sites.length} Lokasi)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pemantauan harian berbasis estimasi radiasi matahari & konfirmasi foto operator
              </p>
            </div>
            {isLoading && (
              <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sites.map((s) => (
              <SiteCard key={s.id} site={s} onSelect={handleSelectSite} />
            ))}
          </div>
        </section>

        {/* Action Tickets Section */}
        <section className="space-y-4">
          <TicketList
            tickets={tickets}
            currentUser={currentUser}
            onApprove={handleApproveTicket}
            onPostpone={handlePostponeTicket}
            onMarkDone={handleMarkTicketDone}
            isLoading={isLoading}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] py-6 text-center text-xs text-slate-500">
        <p>SAURA — Sistem Analisis Unjuk Kerja PLTS & Rekomendasi Aksi • Clean Architecture Prototype</p>
      </footer>

      {/* Site Detail & 7-Day Chart Modal */}
      <SiteDetailModal
        site={selectedSite}
        onClose={() => setSelectedSite(null)}
      />
    </div>
  );
};
