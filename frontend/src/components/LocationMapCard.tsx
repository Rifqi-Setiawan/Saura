import React, { useEffect, useRef } from "react";
import { SiteSummary } from "../types.ts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

  // Exact coordinates matching Saura simulation seed database
  const siteCoordinates: Record<string, { lat: number; lng: number }> = {
    "Balai Desa Cibiru": { lat: -6.927, lng: 107.718 },
    "MA Nurul Huda": { lat: -6.9147, lng: 107.6098 },
    "SDN Sukamaju": { lat: -6.89, lng: 107.62 },
    "SMP Cendekia": { lat: -6.905, lng: 107.64 },
  };

  const createTeardropIcon = (color: string) => {
    const isAlert = color === "#DC2626" || color === "#F59E0B";
    const pulseRing = isAlert
      ? `<div style="
          position: absolute;
          top: 6px;
          left: 6px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.35;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          pointer-events: none;
        "></div>`
      : "";

    const svgHtml = `
      <div style="position: relative; width: 32px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${pulseRing}
        <div style="
          width: 28px;
          height: 36px;
          filter: drop-shadow(0 2px 5px rgba(0,0,0,0.22));
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease;
        ">
          <svg width="28" height="36" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.163 24.837 0 16 0Z" fill="${color}"/>
            <circle cx="16" cy="15" r="5.5" fill="#FFFFFF"/>
          </svg>
        </div>
      </div>
    `;

    return L.divIcon({
      className: "saura-leaflet-pin",
      html: svgHtml,
      iconSize: [32, 40],
      iconAnchor: [16, 36],
      popupAnchor: [0, -36],
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center of Bandung metropolitan area covering all 4 sites with comfortable margins
      const map = L.map(mapContainerRef.current, {
        center: [-6.910, 107.668],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
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

    // Add markers for all sites
    sites.forEach((site) => {
      const coord = siteCoordinates[site.name] || {
        lat: -6.9147,
        lng: 107.6098,
      };

      const color =
        site.status === "CRITICAL"
          ? "#DC2626"
          : site.status === "ACTION"
          ? "#F59E0B"
          : site.status === "NORMAL"
          ? "#2563EB"
          : "#94A3B8";

      const icon = createTeardropIcon(color);
      const marker = L.marker([coord.lat, coord.lng], { icon }).addTo(map);

      marker.on("click", () => {
        onSelectSite(site.id);
      });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
          <strong style="color: #0f172a; font-size: 13px;">${site.name}</strong><br/>
          <span style="color: ${color}; font-weight: 600;">Status: ${site.status}</span><br/>
          <span style="color: #64748b;">Kapasitas: ${site.kwp} kWp</span>
        </div>
      `);
    });

    // Invalidate size after container render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [sites, onSelectSite]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Sebaran lokasi
        </h3>
        <span className="text-[11px] font-medium text-slate-400">
          Bandung Raya
        </span>
      </div>

      {/* Real Interactive Leaflet Map Container */}
      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-200/80 my-1 bg-[#F8FAFC]">
        <div
          ref={mapContainerRef}
          className="w-full h-full z-0"
        />

        {/* Central Watermark Overlay matching mockup ("Bandung / Jawa Barat") */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center z-10 select-none bg-white/80 backdrop-blur-2xs px-3 py-1 rounded-xl border border-slate-200/60 shadow-xs">
          <p className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
            Bandung
          </p>
          <p className="text-[10px] font-semibold text-slate-500 tracking-wide mt-0.5 leading-none">
            Jawa Barat
          </p>
        </div>
      </div>

      {/* Map Legend */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2.5 border-t border-slate-50">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-2xs"></span>
          <span>Kritis</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs"></span>
          <span>Perlu tindakan</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-2xs"></span>
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block shadow-2xs"></span>
          <span>Belum ada data</span>
        </div>
      </div>
    </div>
  );
};
