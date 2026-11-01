import React from "react";
import { User } from "../types.ts";
import {
  Zap,
  LayoutGrid,
  MapPin,
  Inbox,
  BarChart3,
  Settings,
  ChevronDown,
  User as UserIcon,
} from "lucide-react";

interface SidebarProps {
  currentUser: User | null;
  onSwitchUser: (email: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  onSwitchUser,
  activeTab,
  setActiveTab,
}) => {
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);

  const menuItems = [
    { id: "ringkasan", label: "Ringkasan", icon: LayoutGrid },
    { id: "lokasi", label: "Lokasi PLTS", icon: MapPin },
    { id: "tiket", label: "Tiket", icon: Inbox },
    { id: "laporan", label: "Laporan", icon: BarChart3 },
    { id: "pengaturan", label: "Pengaturan", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-200/90 bg-white flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      {/* Top Section */}
      <div className="p-5 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 tracking-tight leading-none">
                Saura
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1 leading-none">
              Data simulasi
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5 pt-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-4 border-t border-slate-100 relative">
        <div
          onClick={() => setShowUserDropdown(!showUserDropdown)}
          className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
              {currentUser?.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate leading-snug">
                {currentUser?.email === "rina@saura.id"
                  ? "Bu Rina"
                  : currentUser?.email === "ahmad@saura.id"
                  ? "Ahmad"
                  : currentUser?.name || "Pengguna"}
              </p>
              <p className="text-xs text-slate-500 truncate leading-none mt-0.5 capitalize">
                {currentUser?.role === "manager"
                  ? "Pengelola"
                  : currentUser?.role === "technician"
                  ? "Teknisi"
                  : currentUser?.role || "Staff"}
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
        </div>

        {/* User Switch Dropdown */}
        {showUserDropdown && (
          <div className="absolute bottom-16 left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-1 z-30">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2.5 py-1">
              Ganti Pengguna Demo
            </p>
            <button
              onClick={() => {
                onSwitchUser("rina@saura.id");
                setShowUserDropdown(false);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-left transition ${
                currentUser?.email === "rina@saura.id"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <UserIcon className="h-3.5 w-3.5 text-blue-600" />
              <span>Bu Rina (Pengelola)</span>
            </button>
            <button
              onClick={() => {
                onSwitchUser("ahmad@saura.id");
                setShowUserDropdown(false);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-left transition ${
                currentUser?.email === "ahmad@saura.id"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <UserIcon className="h-3.5 w-3.5 text-slate-500" />
              <span>Ahmad (Teknisi)</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
