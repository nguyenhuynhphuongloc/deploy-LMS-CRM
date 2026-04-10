"use client";
import { GraduationCap, Link as LinkIcon, X, Video, MapPin } from "lucide-react";
import React from "react";
import {
  DEFAULT_SKILL_COLOR,
  SKILL_COLORS,
  TEST_TYPE_OPTIONS,
} from "./constants";
import { DraggedSlot, SlotData } from "./types";

interface GridCellProps {
  dayKey: string;
  slotKey: string;
  wowId: string | null;
  wowIdx: number;
  slotData?: SlotData;
  canManageSlots: (wowId: string | null) => boolean;
  onOpenResult: (dayKey: string, slotKey: string) => void;
  onOpenRegister: (dayKey: string, slotKey: string) => void;
  onRemoveSlot: (dayKey: string, slotKey: string) => void;
  onDragStart: (slot: DraggedSlot) => void;
  onDragOver: (dayKey: string, slotKey: string) => void;
  onDragLeave: () => void;
  onDrop: (dayKey: string, slotKey: string) => void;
  isDragSource: boolean;
  isDragOver: boolean;
  columnBg?: string;
  branchName?: string;
}

export const GridCell: React.FC<GridCellProps> = ({
  dayKey,
  slotKey,
  wowId,
  wowIdx,
  slotData,
  canManageSlots,
  onOpenResult,
  onOpenRegister,
  onRemoveSlot,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragSource,
  isDragOver,
  columnBg,
  branchName,
}) => {
  const isRegistered = slotData?.registered;
  const isWork = slotData?.type === "work";
  const sc = (SKILL_COLORS[slotData?.skill || ""] ?? DEFAULT_SKILL_COLOR)!;

  return (
    <td
      className={`border border-slate-200 min-w-[140px] ${isWork ? "p-0" : "p-1"} relative transition-colors group 
        ${columnBg || "bg-transparent"} 
        ${
          wowId
            ? isRegistered
              ? isWork
                ? "bg-red-600"
                : slotData?.isCompleted
                  ? slotData.attendance === "present"
                    ? "bg-emerald-50/40"
                    : "bg-rose-50/60"
                  : "bg-white"
              : "bg-slate-100/80 hover:bg-slate-200/50"
            : "cursor-not-allowed bg-slate-200/10"
        }
        ${isDragOver ? "ring-2 ring-blue-400 bg-blue-50/30 z-[1]" : ""}
      `}
      style={isWork ? { height: "1px" } : {}}
      onDragOver={(e) => {
        if (wowId !== null && !isRegistered && canManageSlots(wowId)) {
          e.preventDefault();
          onDragOver(dayKey, slotKey);
        }
      }}
      onDragLeave={onDragLeave}
      onDrop={() => {
        if (wowId !== null && !isRegistered && canManageSlots(wowId)) {
          onDrop(dayKey, slotKey);
        }
      }}
    >
      {isRegistered ? (
        <div
          draggable
          onDragStart={(e) => {
            onDragStart({
              dayKey,
              slotKey,
              data: slotData!,
            });
          }}
          className={`
            ${
              isWork
                ? "bg-red-600 border-none text-white font-black uppercase tracking-widest h-full w-full flex items-center justify-center rounded-none"
                : !slotData?.isCompleted
                  ? "bg-slate-200 border-slate-200 text-red-600 font-bold shadow-sm rounded-lg"
                  : slotData?.attendance === "present"
                    ? "bg-emerald-500 border-emerald-400 text-white shadow-md font-bold rounded-lg"
                    : "bg-slate-100 border-red-500 border-2 text-rose-700 shadow-sm font-bold rounded-lg"
            } 
            border-[1.5px] px-2 py-1.5 relative transition-all hover:scale-[1.01] cursor-pointer active:cursor-grabbing ${isDragSource ? "opacity-30 scale-95" : "opacity-100"}
          `}
          style={isWork ? { minHeight: "44px" } : { minHeight: "44px" }}
          onClick={() => {
            if (canManageSlots(wowId) && !isWork) {
              onOpenResult(dayKey, slotKey);
            }
          }}
        >
          {canManageSlots(wowId) && (
            <div
              className={`absolute top-[3px] right-[3px] w-4 h-4 rounded-full bg-slate-800/10 text-white border-none text-[10px] leading-none cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-[10]`}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveSlot(dayKey, slotKey);
              }}
            >
              <X size={10} strokeWidth={3} />
            </div>
          )}

          {isWork ? (
            <div className="text-[12px] font-black text-white text-center truncate px-1">
              {(slotData?.workType || "CÔNG VIỆC").toUpperCase()}
            </div>
          ) : (
            <>
              <div
                className={`text-[11px] font-bold ${
                  slotData?.isCompleted
                    ? slotData.attendance === "present"
                      ? "text-white"
                      : "text-rose-700"
                    : !slotData?.isCompleted
                      ? "text-red-600 drop-shadow-sm"
                      : sc.name
                } mb-0.5 whitespace-nowrap overflow-hidden`}
              >
                {slotData?.studentName || ""}
                <span className="ml-1.5 inline-flex items-center gap-0.5">
                  {slotData?.meetingType === "offline" ? (
                    <span className="bg-red-500 text-white px-1 rounded text-[8px] font-black flex items-center gap-0.5 uppercase">
                      OFF
                    </span>
                  ) : (
                    <span className="bg-red-500 text-white px-1 rounded text-[8px] font-black flex items-center gap-0.5 uppercase">
                      ONL
                    </span>
                  )}
                </span>

                {slotData?.isCompleted && slotData.attendance !== "present" && (
                  <span className="ml-1 text-[8px] px-1 bg-rose-500 text-white rounded font-bold uppercase">
                    Vắng mặt
                  </span>
                )}
              </div>
              <div
                className={`text-[10px] ${
                  slotData?.isCompleted
                    ? slotData.attendance === "present"
                      ? "text-white"
                      : "text-rose-600/70"
                    : "text-black"
                } font-semibold uppercase tracking-wide flex items-center justify-between mb-0.5`}
              >
                <span className="flex items-center gap-1">
                  {TEST_TYPE_OPTIONS.find((t) => t.value === slotData?.testType)
                    ?.label || ""}
                  {slotData?.partTest
                    ? ` (${slotData.partTest
                        .replace(/_/g, " ")
                        .replace(/,/g, ", ")
                        .toUpperCase()})`
                    : ""}
                </span>
              </div>

              {slotData?.className && (
                <div
                  className={`text-[10px] font-bold ${
                    slotData?.isCompleted
                      ? slotData.attendance === "present"
                        ? "text-white"
                        : "text-rose-600/80"
                      : "text-red-500"
                  }  flex items-center gap-1`}
                >
                  <GraduationCap size={12} className="flex-shrink-0 text-purple-500" />
                  <span className="truncate">{slotData.className}</span>
                </div>
              )}
            </>
          )}

          {/* HOVER DETAILS PANEL */}
          <div className="absolute left-full top-0 ml-2 w-64 p-3 bg-white border border-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none text-slate-800">
            {isWork ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[12px] font-bold text-slate-900">
                    Chi tiết công việc
                  </span>
                  <span
                    className={`text-[9px] ${slotData?.workType === "meeting" ? "bg-blue-600" : "bg-red-600"} text-white px-1.5 py-0.5 rounded-full font-bold uppercase`}
                  >
                    Work
                  </span>
                </div>
                <div className="py-2">
                  <span
                    className={`text-[14px] font-black ${slotData?.workType?.toLowerCase()?.includes("meeting") || slotData?.workType?.toLowerCase()?.includes("họp") ? "text-blue-600" : "text-red-600"} uppercase tracking-widest text-center block truncate px-2`}
                  >
                    {slotData?.workType || "CÔNG VIỆC"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[12px] font-bold text-slate-900">
                    Chi tiết đăng ký
                  </span>
                  <span
                    className={`text-[9px] ${sc.badge} text-white px-1.5 py-0.5 rounded-full font-bold uppercase`}
                  >
                    {TEST_TYPE_OPTIONS.find(
                      (t) => t.value === slotData?.testType,
                    )?.label ||
                      slotData?.testType ||
                      ""}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Row 1: Class and Student */}
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <GraduationCap size={12} className="text-purple-500" />
                        <span className="text-[10px] text-red-500 font-black uppercase tracking-tight">Lớp học</span>
                      </div>
                      <div className="text-[12px] font-bold text-slate-800 pl-4.5 truncate">
                        {slotData?.className || "N/A"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-red-500 font-black uppercase tracking-tight">Học viên</span>
                      </div>
                      <div className="text-[12px] font-bold text-slate-800 pl-0">
                        {slotData?.studentName}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Type and Branch */}
                  <div className="flex items-start gap-4 pt-1 border-t border-slate-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-red-500 font-black uppercase tracking-tight">Hình thức</span>
                      </div>
                      <div className="flex items-center gap-1.5 pl-0">
                        {slotData?.meetingType === "offline" ? (
                          <>
                            <MapPin size={11} className="text-red-500" />
                            <span className="text-[12px] text-slate-500 font-bold italic">Offline</span>
                          </>
                        ) : (
                          <>
                            <Video size={11} className="text-red-500" />
                            <span className="text-[12px] text-blue-600 font-bold italic">Online</span>
                          </>
                        )}
                      </div>
                    </div>
                    {branchName && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <MapPin size={12} className="text-red-500" />
                          <span className="text-[10px] text-red-500 font-black uppercase tracking-tight">Cơ sở</span>
                        </div>
                        <div className="text-[12px] font-bold text-slate-800 pl-4.5 truncate">
                          {branchName}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Test Info */}
                  <div className="flex items-start gap-4 pt-1 border-t border-slate-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-red-500 font-black uppercase tracking-tight">Loại bài</span>
                      </div>
                      <div className="text-[12px] font-bold text-slate-800 capitalize pl-0">
                        {TEST_TYPE_OPTIONS.find(
                          (t) => t.value === slotData?.testType,
                        )?.label ||
                          slotData?.testType ||
                          "N/A"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-red-500 font-black uppercase tracking-tight">Phần thi</span>
                      </div>
                      <div className="text-[12px] font-bold text-slate-800 pl-0">
                        {slotData?.partTest
                          ?.replace(/_/g, " ")
                          ?.replace(/,/g, ", ")
                          ?.toUpperCase() || ""}
                      </div>
                    </div>
                  </div>

                  {!slotData?.isCompleted ? (
                    <>
                      {slotData?.testDescription && (
                        <div className="flex flex-col border-t border-slate-100 pt-2 pb-0.5">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">
                            Chi tiết đăng ký
                          </span>
                          <p className="text-[11px] text-slate-600 leading-relaxed max-h-24 overflow-y-auto italic pl-1 border-l-2 border-red-100">
                            "{slotData.testDescription}"
                          </p>
                        </div>
                      )}

                      {slotData?.wowNote && (
                        <div className="flex flex-col border-t border-slate-100 pt-2">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">
                            Ghi chú từ học viên
                          </span>
                          <p className="text-[11px] text-slate-600 leading-relaxed max-h-24 overflow-y-auto italic pl-1 border-l-2 border-rose-100">
                            "{slotData.wowNote}"
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                          Chi tiết điểm số
                        </span>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { label: "FC", val: slotData.s1 },
                            { label: "LR", val: slotData.s2 },
                            { label: "GRA", val: slotData.s3 },
                            { label: "PR", val: slotData.s4 },
                          ].map((s) => (
                            <div
                              key={s.label}
                              className="bg-white p-1 rounded-lg border border-slate-100 flex flex-col items-center shadow-sm"
                              title={
                                s.label === "FC"
                                  ? "Fluency and Coherence"
                                  : s.label === "LR"
                                    ? "Lexical Resource"
                                    : s.label === "GRA"
                                      ? "Grammatical Range and Accuracy"
                                      : "Pronunciation"
                              }
                            >
                              <span className="text-[8px] text-slate-400 font-bold">
                                {s.label}
                              </span>
                              <span className="text-[10px] font-black text-slate-700">
                                {s.val || "0"}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between bg-emerald-600 p-1.5 rounded-lg text-white">
                          <span className="text-[9px] font-bold uppercase">
                            Overall Score
                          </span>
                          <span className="text-[12px] font-black">
                            {slotData.overall || "0.0"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col border-t border-slate-100 pt-1.5">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">
                            Kết quả từ WOW
                          </span>
                          {slotData.attendance !== "present" && (
                            <span className="text-[9px] font-bold text-rose-500 uppercase italic">
                              Vắng mặt
                            </span>
                          )}
                        </div>
                        {slotData.wowComment ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(slotData.wowComment, "_blank");
                            }}
                            className="flex items-center justify-center w-full bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-all group/link"
                          >
                            <span className="text-[10px] font-bold truncate">
                              Chi tiết đánh giá
                            </span>
                          </button>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic bg-slate-50 p-2 rounded-lg border-l-2 border-slate-200">
                            Chưa cập nhật tài liệu.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="absolute top-4 -left-1.5 w-3 h-3 bg-white border-l border-b border-slate-200 rotate-45"></div>
          </div>
        </div>
      ) : wowId ? (
        <div
          className="w-full h-full min-h-[44px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg transition-all hover:border-red-400 hover:bg-red-50/50 cursor-pointer shadow-sm group"
          onClick={() => {
            if (canManageSlots(wowId)) {
              onOpenRegister(dayKey, slotKey);
            }
          }}
        >
          <span className="text-[16px] text-red-500 font-black group-hover:scale-125 transition-transform">
            +
          </span>
        </div>
      ) : (
        <div className="w-full h-full min-h-[44px] flex items-center justify-center border-2 border-slate-100 bg-slate-100/50 rounded-lg">
          <span className="text-slate-300 font-bold select-none">
            <X size={14} strokeWidth={2.5} />
          </span>
        </div>
      )}
    </td>
  );
};
