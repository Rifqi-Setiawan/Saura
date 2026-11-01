import React from "react";
import { FastForward, CheckCircle, Info } from "lucide-react";

interface SimulationBarProps {
  simDate: string;
  onAdvanceTo30: () => void;
  isLoading: boolean;
}

export const SimulationBar: React.FC<SimulationBarProps> = ({
  simDate,
  onAdvanceTo30,
  isLoading,
}) => {
  const isTargetReached = simDate >= "2026-10-30";

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-start space-x-3.5">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 mt-0.5">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-slate-100">
              Skenario Replay Simulasi (26 Okt – 30 Okt 2026)
            </h3>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
              Status: {simDate}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {isTargetReached ? (
              <span className="text-emerald-400 font-medium flex items-center">
                <CheckCircle className="h-3.5 w-3.5 mr-1 inline" />
                Simulasi selesai: Siklus intervensi teknisi telah dijalankan, dan kinerja MA Nurul Huda pulih selama 3 hari berturut-turut (29, 30, 31 kWh &ge; 90%). Tiket SA-024 ditutup otomatis!
              </span>
            ) : (
              <span>
                Demo kondisi <strong>26 Okt 2026</strong>: MA Nurul Huda mengalami status <strong>ACTION</strong> (20 kWh vs 32 kWh) dan tiket SA-024 menunggu persetujuan Manajer. Klik tombol untuk memajukan waktu dan melihat pemulihan otomatis.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 self-end md:self-center">
        {!isTargetReached ? (
          <button
            onClick={onAdvanceTo30}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow"
          >
            <FastForward className="h-4 w-4" />
            <span>{isLoading ? "Memproses..." : "Majukan ke 30 Okt"}</span>
          </button>
        ) : (
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center space-x-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span>Siklus Pulih Terverifikasi</span>
          </div>
        )}
      </div>
    </div>
  );
};
