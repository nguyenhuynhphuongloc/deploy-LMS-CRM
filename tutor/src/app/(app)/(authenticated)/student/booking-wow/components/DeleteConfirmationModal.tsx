"use client";
import React from "react";
import { AlertCircle, X } from "lucide-react";

interface DeleteConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = "Xác nhận hủy lịch",
  message = "Bạn có chắc chắn muốn hủy lịch đăng ký này không? Hành động này không thể hoàn tác.",
  isLoading = false,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[9999] animate-in fade-in backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-[400px] max-w-[90vw] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 text-[14px] leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl font-bold text-slate-600 transition-colors ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200"
            }`}
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => {
              if (!isLoading) {
                 onConfirm();
              }
            }}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl font-bold text-white transition-all shadow-md shadow-red-200 flex items-center gap-2 ${
              isLoading ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 active:scale-95"
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lí...
              </>
            ) : "Đồng ý hủy"}
          </button>
        </div>
      </div>
    </div>
  );
};
