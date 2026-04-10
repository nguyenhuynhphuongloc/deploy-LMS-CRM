"use client";
import React from "react";
import { DAYS } from "./constants";
import { WowAdmin } from "./types";

interface WowAssignmentModalProps {
  open: boolean;
  dayKey: string;
  wowIndex?: number;
  wowAdmins: WowAdmin[];
  selectedWows: string[];
  onToggleWow: (id: string) => void;
  onClose: () => void;
  onSave: () => void;
  isLoading?: boolean;
}

export const WowAssignmentModal: React.FC<WowAssignmentModalProps> = ({
  open,
  dayKey,
  wowIndex,
  wowAdmins,
  selectedWows,
  onToggleWow,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!open) return null;

  // Hiển thị toàn bộ danh sách WOW (không giới hạn chọn nhiều cột/ca)
  const availableAdmins = wowAdmins;

  const currentWowId = selectedWows[0] || "";
  const currentWowName = wowAdmins.find((w) => w.id === currentWowId)?.fullName || "Trống";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] px-8 py-8 w-[380px] max-w-[95vw] shadow-[0_25px_60px_rgba(0,0,0,0.25)] animate-in slide-in-from-bottom-4 duration-400 flex flex-col min-h-[440px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 shadow-sm border border-red-100 flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
            Chọn WOW trực <br />
            <span className="text-red-500 text-lg">
              {DAYS.find((d) => d.key === dayKey)?.label}
            </span>
          </h2>
        </div>

        <div className="flex-1 flex flex-col pt-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-2.5 ml-1">
            Danh sách nhân sự
          </label>
          <div className="relative">
            <div 
              className={`flex items-center w-full h-16 px-5 gap-3.5 rounded-2xl border-2 transition-all cursor-pointer group shadow-sm ${
                isOpen 
                  ? "border-red-500 bg-white ring-[8px] ring-red-500/5 shadow-md" 
                  : "border-slate-100 bg-slate-50 hover:border-slate-200"
              }`}
              onClick={() => setIsOpen(!isOpen)}
            >
              <div className={`transition-colors flex-shrink-0 ${isOpen || currentWowId ? "text-red-500" : "text-slate-400"}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              
              <div className={`flex-1 text-[15px] font-black truncate select-none ${currentWowId ? "text-slate-800" : "text-slate-400"}`}>
                {currentWowName}
              </div>

              <div className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-red-500" : "text-slate-400"}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Custom Dropdown List */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top">
                <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                  <div 
                    className={`px-5 py-3.5 text-[14px] font-black cursor-pointer transition-colors border-l-4 ${
                      !currentWowId 
                        ? "bg-red-50 text-red-600 border-red-500" 
                        : "text-slate-400 hover:bg-slate-50 border-transparent"
                    }`}
                    onClick={() => {
                      onToggleWow("");
                      setIsOpen(false);
                    }}
                  >
                    Trống
                  </div>
                  {availableAdmins.map((w) => (
                    <div 
                      key={w.id}
                      className={`px-5 py-3.5 text-[14px] font-black cursor-pointer transition-colors border-l-4 ${
                        currentWowId === w.id 
                          ? "bg-red-50 text-red-600 border-red-500" 
                          : "text-slate-600 hover:bg-slate-50 border-transparent"
                      }`}
                      onClick={() => {
                        onToggleWow(w.id);
                        setIsOpen(false);
                      }}
                    >
                      {w.fullName || w.id}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {availableAdmins.length === 0 && (
            <div className="text-slate-400 text-[12px] p-6 text-center border-2 border-dashed border-slate-100 rounded-3xl mt-6">
              Hiện tại không có dữ liệu WOW
            </div>
          )}
        </div>

        <div className="mt-8">
          <button
            className={`w-full h-14 rounded-2xl text-[15px] font-black text-white transition-all border-none ${
              isLoading 
                ? "bg-slate-400 cursor-not-allowed" 
                : "bg-red-500 shadow-[0_8px_16px_rgba(239,68,68,0.25)] hover:bg-red-600 hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
            }`}
            onClick={onSave}
            disabled={isLoading}
          >
            {isLoading ? "ĐANG XỬ LÝ..." : "LƯU"}
          </button>
          <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4">
            ITTS v2.0 • Personnel Selection
          </p>
        </div>
      </div>
    </div>
  );
};
