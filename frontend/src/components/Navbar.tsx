import React from "react";
import { User } from "../types.ts";
import { Sun, RefreshCw } from "lucide-react";

interface NavbarProps {
  currentUser: User | null;
  simDate: string;
  onSwitchUser: (email: string) => void;
  onResetSim: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  simDate,
  onSwitchUser,
  onResetSim,
  isLoading,
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-white">SAURA</span>
              <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                PLTS Monitor
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Sistem Analisis Unjuk Kerja & Rekomendasi Aksi
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          {/* Simulation Date Badge */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-md text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-slate-400">Simulasi:</span>
            <span className="font-semibold text-slate-200 tabular-nums">{simDate}</span>
            <button
              onClick={onResetSim}
              disabled={isLoading}
              title="Reset data demo ke 26 Okt"
              className="ml-1 text-slate-400 hover:text-amber-400 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* User Role Switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => onSwitchUser("rina@saura.id")}
              className={`px-2.5 py-1 rounded transition-colors ${
                currentUser?.email === "rina@saura.id"
                  ? "bg-amber-500 text-slate-950 font-semibold"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Bu Rina (Manajer)
            </button>
            <button
              onClick={() => onSwitchUser("ahmad@saura.id")}
              className={`px-2.5 py-1 rounded transition-colors ${
                currentUser?.email === "ahmad@saura.id"
                  ? "bg-amber-500 text-slate-950 font-semibold"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Ahmad (Teknisi)
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
