"use client";
import { X } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";

interface ResultModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (formToSave: any) => void;
  form: any;
  dayLabel: string;
  studentName: string;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  open,
  onClose,
  onSave,
  form: initialForm,
  dayLabel,
  studentName,
}) => {
  const [step, setStep] = useState(1);
  const [form, setLocalForm] = useState(initialForm);
  const wowCommentRef = useRef<HTMLInputElement>(null);

  // Sync internal state when props change
  useEffect(() => {
    if (open) {
      setStep(1);
      setLocalForm(initialForm);
      if (wowCommentRef.current) wowCommentRef.current.value = initialForm.wowComment || "";
    }
  }, [open, initialForm]);

  // Tự động tính Overall khi S1-S4 thay đổi
  useEffect(() => {
    const scores = [
      Number(form.s1),
      Number(form.s2),
      Number(form.s3),
      Number(form.s4),
    ];
    const avg = scores.reduce((a, b) => a + b, 0) / 4;
    // IELTS Rounding: làm tròn xuống mức 0.5 gần nhất
    const floored = Math.floor(avg * 2) / 2;
    if (!isNaN(floored) && form.attendance === "present") {
      setLocalForm((prev: any) => ({ ...prev, overall: floored.toString() }));
    }
  }, [form.s1, form.s2, form.s3, form.s4, form.attendance]);

  if (!open) return null;

  const handleAttendanceSelect = (status: string) => {
    if (status === "present") {
      setLocalForm((prev: any) => ({ ...prev, attendance: status }));
      setStep(2);
    } else {
      const updatedForm = { ...form, attendance: status, isCompleted: true, wowComment: wowCommentRef.current?.value || "" };
      setLocalForm(updatedForm);
      onSave(updatedForm);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] animate-in fade-in transition-colors backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl overflow-hidden w-[450px] max-w-[95vw] shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
              {step === 1 ? "Bước 1: Điểm danh" : "Bước 2: Chấm điểm"}
            </span>
            <div
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={20} />
            </div>
          </div>
          <h3 className="text-xl font-black text-slate-800">{studentName}</h3>
          <p className="text-slate-500 text-xs font-medium mt-1">
            {dayLabel} • {form.testType?.toUpperCase() || "KIỂM TRA"}
          </p>
        </div>

        <div className="p-8">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                {[
                  {
                    id: "present",
                    label: "Có mặt",
                    color:
                      "hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 bg-slate-50",
                  },
                  {
                    id: "absent",
                    label: "Vắng mặt",
                    color:
                      "hover:border-rose-500 hover:bg-rose-50 text-rose-700 bg-slate-50",
                  },
                ].map((st) => (
                  <div
                    key={st.id}
                    onClick={() => handleAttendanceSelect(st.id)}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 cursor-pointer transition-colors ${st.color} group relative overflow-hidden`}
                  >
                    <div className="flex-1">
                      <p className="text-[16px] font-black">{st.label}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-colors transform translate-x-2 group-hover:translate-x-0">
                      →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "s1", label: "FC", full: "Fluency & Coherence" },
                  { id: "s2", label: "LR", full: "Lexical Resource" },
                  { id: "s3", label: "GRA", full: "Grammar Range & Acc" },
                  { id: "s4", label: "PR", full: "Pronunciation" },
                ].map((field) => (
                  <div key={field.id} className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="9"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-lg font-black text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                      value={form[field.id] || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(",", ".");
                        if (val === "") {
                          setLocalForm((prev: any) => ({
                            ...prev,
                            [field.id]: "",
                          }));
                          return;
                        }
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                          if (num > 9 || num < 0) return;
                        }
                        setLocalForm((prev: any) => ({
                          ...prev,
                          [field.id]: val,
                        }));
                      }}
                      placeholder="0.0"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-end pointer-events-none">
                      <span className="text-[8px] text-red-500 whitespace-nowrap font-bold">
                        {field.full}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Display */}
              <div className="bg-red-600 p-5 rounded-2xl flex items-center justify-between text-white shadow-xl shadow-red-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[2px] opacity-80">
                    Overall Score
                  </span>
                </div>
                <span className="text-4xl font-black">
                  {form.overall || "0.0"}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Đánh giá chi tiết
                </label>
                <input
                  ref={wowCommentRef}
                  type="url"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-[14px] outline-none focus:ring-2 focus:ring-emerald-500 transition-colors font-medium text-slate-700"
                  defaultValue={initialForm.wowComment || ""}
                  placeholder="Dán đường link đánh giá chi tiết vào đây..."
                />
              </div>

              <div
                className="w-full py-4 border-none bg-red-600 rounded-2xl text-[15px] font-black text-white text-center cursor-pointer hover:bg-red-700 shadow-xl shadow-red-100 transition-colors active:scale-[0.98]"
                onClick={() => onSave({ ...form, wowComment: wowCommentRef.current?.value || "" })}
              >
                Hoàn tất
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
