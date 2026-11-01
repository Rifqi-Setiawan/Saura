import React, { useEffect, useRef, useState } from "react";
import { SiteSummary } from "../types.ts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Minus, RotateCcw, MapPin } from "lucide-react";

interface LocationMapCardProps {
  sites: SiteSummary[];
  onSelectSite: (siteId: string) => void;
}

export const LocationMapCard: React.FC<LocationMapCardProps> = ({
  sites,
  onSelectSite,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);

  // Exact coordinates matching Saura simulation database
  const siteCoordinates: Record<string, { lat: number; lng: number; shortName: string }> = {
    "Balai Desa Cibiru": { lat: -6.927, lng: 107.718, shortName: "Cibiru" },
    "MA Nurul Huda": { lat: -6.9147, lng: 107.6098, shortName: "Nurul Huda" },
    "SDN Sukamaju": { lat: -6.89, lng: 107.62, shortName: "Sukamaju" },
    "SMP Cendekia": { lat: -6.905, lng: 107.64, shortName: "Cendekia" },
  };

  const createTeardropIcon = (color: string, label: string, isAlert: boolean) => {
    const pulseRing = isAlert
      ? `<div style="
          position: absolute;
          top: 4px;
          left: 4px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.45;
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          pointer-events: none;
        "></div>`
      : "";

    const svgHtml = `
      <div style="position: relative; width: 36px; height: 50px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        ${pulseRing}
        <div style="
          width: 32px;
          height: 38px;
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.28));
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <svg width="32" height="38" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.163 24.837 0 16 0Z" fill="${color}"/>
            <circle cx="16" cy="15" r="6" fill="#FFFFFF"/>
            <circle cx="16" cy="15" r="2.5" fill="${color}"/>
          </svg>
        </div>
        <div style="
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(4px);
          color: #ffffff;
          font-family: inherit;
          font-weight: 700;
          font-size: 10px;
          padding: 1.5px 7px;
          border-radius: 6px;
          white-space: nowrap;
          margin-top: -2px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
          letter-spacing: -0.01em;
          border: 1px solid rgba(255, 255, 255, 0.2);
        ">
          ${label}
        </div>
      </div>
    `;

    return L.divIcon({
      className: "saura-leaflet-pin",
      html: svgHtml,
      iconSize: [60, 56],
      iconAnchor: [30, 38],
      popupAnchor: [0, -38],
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center of Bandung metropolitan area covering all 4 sites with comfortable margins
      const map = L.map(mapContainerRef.current, {
        center: [-6.91, 107.662],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: true,
      });

      // Free OpenStreetMap Standard Tiles (Zero watermarks, high detail road and terrain network)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        subdomains: ["a", "b", "c"],
        className: "map-tiles-clean",
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    markersRef.current = {};

    // Add markers for all sites
    sites.forEach((site) => {
      const coord = siteCoordinates[site.name] || {
        lat: -6.9147,
        lng: 107.6098,
        shortName: site.name,
      };

      const isAlert = site.status === "CRITICAL" || site.status === "ACTION";
      const color =
        site.status === "CRITICAL"
          ? "#DC2626"
          : site.status === "ACTION"
          ? "#F59E0B"
          : site.status === "NORMAL"
          ? "#2563EB"
          : "#94A3B8";

      const icon = createTeardropIcon(color, coord.shortName, isAlert);
      const marker = L.marker([coord.lat, coord.lng], { icon }).addTo(map);
      markersRef.current[site.id] = marker;

      marker.on("click", () => {
        setActiveSiteId(site.id);
      });

      const statusLabel =
        site.status === "CRITICAL"
          ? "Kritis"
          : site.status === "ACTION"
          ? "Perlu Tindakan"
          : site.status === "NORMAL"
          ? "Normal"
          : "Belum Ada Data";

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 170px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <strong style="color: #0f172a; font-size: 13px;">${site.name}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${color};"></span>
            <span style="color: ${color}; font-weight: 700; font-size: 11px;">${statusLabel}</span>
            <span style="color: #94a3b8; font-size: 11px;">•</span>
            <span style="color: #64748b; font-weight: 600; font-size: 11px;">${site.kwp} kWp</span>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; font-size: 11px;">
            <span style="color: #64748b;">Produksi Hari Ini:</span><br/>
            <strong style="color: #0f172a; font-size: 12px;">${site.actual_kwh !== null ? `${site.actual_kwh} / ${site.expected_kwh} kWh` : "Belum ada telemetri"}</strong>
          </div>
          <button id="btn-popup-${site.id}" style="
            width: 100%;
            background: #2563eb;
            color: #ffffff;
            font-weight: 600;
            font-size: 11px;
            padding: 5px 8px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          ">
            <span>Buka Rincian Situs</span>
            <span>&rarr;</span>
          </button>
        </div>
      `);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-popup-${site.id}`);
        if (btn) {
          btn.onclick = () => onSelectSite(site.id);
        }
      });
    });

    // Invalidate size after container render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [sites, onSelectSite]);

  const handlePanToSite = (siteId: string) => {
    setActiveSiteId(siteId);
    const site = sites.find((s) => s.id === siteId);
    if (!site || !mapInstanceRef.current) return;

    const coord = siteCoordinates[site.name];
    if (coord) {
      mapInstanceRef.current.flyTo([coord.lat, coord.lng], 13.5, {
        duration: 0.8,
      });
      const marker = markersRef.current[siteId];
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 850);
      }
    }
  };

  const handleResetView = () => {
    setActiveSiteId(null);
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([-6.91, 107.662], 12, {
      duration: 0.8,
    });
    mapInstanceRef.current.closePopup();
  };

  const criticalCount = sites.filter((s) => s.status === "CRITICAL").length;
  const actionCount = sites.filter((s) => s.status === "ACTION").length;
  const normalCount = sites.filter((s) => s.status === "NORMAL").length;
  const noDataCount = sites.filter((s) => s.status === "NO_DATA").length;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      {/* Header with Title and Quick Filter Pills */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Sebaran Lokasi PLTS
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Bandung Raya
          </span>
        </div>

        {/* Quick Pan Site Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
          <button
            onClick={handleResetView}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0 ${
              activeSiteId === null
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            Semua
          </button>
          {sites.map((s) => {
            const isSelected = activeSiteId === s.id;
            const dotColor =
              s.status === "CRITICAL"
                ? "bg-red-500"
                : s.status === "ACTION"
                ? "bg-amber-500"
                : s.status === "NORMAL"
                ? "bg-blue-600"
                : "bg-slate-400";

            return (
              <button
                key={s.id}
                onClick={() => handlePanToSite(s.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? "bg-blue-50 border border-blue-300 text-blue-700 font-semibold"
                    : "bg-slate-50 border border-slate-200/70 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                <span>{s.name.replace("Balai Desa ", "").replace("MA ", "").replace("SDN ", "").replace("SMP ", "")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Real Interactive Leaflet Map Container (Expanded Height: h-60) */}
      <div className="relative w-full h-60 rounded-xl overflow-hidden border border-slate-200/80 my-1 bg-[#F8FAFC]">
        <div
          ref={mapContainerRef}
          className="w-full h-full z-0"
        />

        {/* Central Region Badge Overlay */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200/70 shadow-2xs z-10 pointer-events-none select-none">
          <p className="text-[11px] font-extrabold text-slate-900 leading-tight">
            Bandung
          </p>
          <p className="text-[9px] font-semibold text-slate-500 leading-tight">
            Jawa Barat • 4 Situs
          </p>
        </div>

        {/* Custom Mini Zoom Controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Perbesar"
            className="w-7 h-7 bg-white/95 hover:bg-white text-slate-700 rounded-lg shadow-2xs border border-slate-200/80 flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Perkecil"
            className="w-7 h-7 bg-white/95 hover:bg-white text-slate-700 rounded-lg shadow-2xs border border-slate-200/80 flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleResetView}
            title="Pusatkan Peta"
            className="w-7 h-7 bg-white/95 hover:bg-white text-slate-700 rounded-lg shadow-2xs border border-slate-200/80 flex items-center justify-center transition cursor-pointer active:scale-95 mt-1"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Enhanced Map Legend with Real Counts */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-600 inline-block shadow-2xs animate-pulse"></span>
          <span>Kritis <strong className="text-slate-900">({criticalCount})</strong></span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shadow-2xs animate-pulse"></span>
          <span>Perlu tindakan <strong className="text-slate-900">({actionCount})</strong></span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shadow-2xs"></span>
          <span>Normal <strong className="text-slate-900">({normalCount})</strong></span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block shadow-2xs"></span>
          <span>Belum ada data <strong className="text-slate-900">({noDataCount})</strong></span>
        </div>
      </div>
    </div>
  );
};
