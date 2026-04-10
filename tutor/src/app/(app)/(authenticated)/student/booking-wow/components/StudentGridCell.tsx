"use client";
import React from "react";
import { GraduationCap, X, Video, Link as LinkIcon, MapPin } from "lucide-react";
import { SKILL_COLORS, DEFAULT_SKILL_COLOR, TEST_TYPE_OPTIONS } from "@/components/ScheduleView/parts/constants";
import { SlotData } from "@/components/ScheduleView/parts/types";

interface StudentGridCellProps {
  dayKey: string;
  dateStr: string;
  slotKey: string;
  wowId: string | null;
  slotData?: SlotData;
  currentStudentId: string;
  remains: number;
  onOpenRegister: (dayKey: string, slotKey: string) => void;
  onRemoveSlot: (dayKey: string, slotKey: string) => void;
  columnBg?: string;
  leadTimeDays: number;
  deleteLeadTimeDays?: number;
}

export const StudentGridCell: React.FC<StudentGridCellProps> = ({
  dayKey,
  dateStr,
  slotKey,
  wowId,
  slotData,
  currentStudentId,
  remains,
  onOpenRegister,
  onRemoveSlot,
  columnBg,
  leadTimeDays,
  deleteLeadTimeDays = 2,
}) => {
  const isRegistered = slotData?.registered;
  const isMine = isRegistered && slotData?.studentId === currentStudentId;
  const isOther = isRegistered && slotData?.studentId !== currentStudentId;
  const isWork = slotData?.type === "work";
  
  const sc = (SKILL_COLORS[slotData?.skill || ""] ?? DEFAULT_SKILL_COLOR)!;

  // Lấy giờ bắt đầu từ slotKey: "19:30_col_1" -> "19:30"
  const startHourStr = slotKey.split("_")[0];
  
  // Tính toán thời điểm bắt đầu theo chuẩn Local Date
  const isDeleteBlocked = React.useMemo(() => {
    try {
      if (!dateStr) return false;
      const [year, month, day] = dateStr.split("-").map(num => parseInt(num, 10));
      const slotDate = new Date(year!, month! - 1, day!);
      slotDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const limitDate = new Date(today);
      limitDate.setDate(today.getDate() + deleteLeadTimeDays);

      return slotDate < limitDate;
    } catch {
      return false;
    }
  }, [dateStr, deleteLeadTimeDays]);

  const isOutOfQuota = remains <= 0;

  // Render các ô như sau:
  return (
    <td
      className={`border border-slate-100 min-w-[140px] p-1.5 relative transition-colors group h-[60px]
        ${columnBg || "bg-white"} 
        ${
          wowId
            ? isMine
              ? slotData?.isCompleted
                ? slotData.attendance === "present"
                  ? "bg-emerald-50/60"
                  : "bg-rose-50/80"
                : "bg-red-50/30"
              : isOther || isWork
                ? "bg-slate-200/20"
                : (isDeleteBlocked || isOutOfQuota)
                  ? "cursor-not-allowed bg-slate-100/30" // Khoá sát giờ hoặc hết quota 
                  : "hover:bg-white/40"
            : "cursor-not-allowed bg-slate-100/20"
        }
      `}
    >
      {isMine ? (
        <div
          className={`
            ${
              !slotData?.isCompleted
                ? "bg-rose-50 border-rose-200 text-red-600 font-bold shadow-sm rounded-lg"
                : slotData?.attendance === "present"
                  ? "bg-emerald-500 border-emerald-400 text-white shadow-md font-bold rounded-lg"
                  : "bg-white border-red-500 border-2 text-rose-700 shadow-sm font-bold rounded-lg"
            } 
            border-[1.5px] px-2 py-1.5 relative transition-all hover:scale-[1.01] cursor-default flex flex-col justify-center h-full
          `}
          style={{ minHeight: '48px' }}
        >
          {/* Nút xóa cho học viên (chỉ hiện khi chưa hoàn thành và chưa quá hạn xóa) */}
          {!slotData?.isCompleted && !isDeleteBlocked && (
            <div
              className="absolute top-[3px] right-[3px] w-4 h-4 rounded-full bg-slate-800/10 text-slate-500 border-none text-[10px] leading-none cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 hover:text-white z-[10]"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveSlot(dayKey, slotKey);
              }}
            >
              ×
            </div>
          )}

          <>
            <div
              className={`text-[11px] font-bold ${
                slotData?.isCompleted 
                  ? slotData.attendance === "present" 
                    ? "text-white" 
                    : "text-rose-700"
                  : "text-red-600 drop-shadow-sm"
              } mb-0.5 whitespace-nowrap overflow-hidden`}
            >
              {slotData?.studentName || "Lịch của tôi"}
              <span className="ml-1.5 inline-flex items-center gap-0.5">
                {slotData?.meetingType === "offline" ? (
                  <span className={`bg-red-500 text-white px-1 rounded text-[8px] font-black flex items-center gap-0.5 uppercase`}>
                    OFF
                  </span>
                ) : (
                  <span className={`bg-red-500 text-white px-1 rounded text-[8px] font-black flex items-center gap-0.5 uppercase`}>
                    ONL
                  </span>
                )}
              </span>
              {slotData?.isCompleted &&
                slotData.attendance !== "present" && (
                  <span className="ml-1 text-[8px] px-1 bg-rose-500 text-white rounded font-bold uppercase">
                    Vắng mặt
                  </span>
                )}
            </div>
            <div
              className={`text-[10px] ${
                slotData?.isCompleted ? (slotData.attendance === "present" ? "text-white" : "text-rose-600/70") : "text-slate-500"
              } font-semibold uppercase tracking-wide flex items-center justify-between mb-0.5`}
            >
              <span className="flex items-center gap-1">
                {TEST_TYPE_OPTIONS.find(
                  (t) => t.value === slotData?.testType,
                )?.label || ""}
                {slotData?.partTest
                  ? ` (${slotData.partTest.replace(/_/g, " ").toUpperCase()})`
                  : ""}
              </span>
            </div>

            {slotData?.className && (
              <div className={`text-[10px] font-bold ${
                slotData?.isCompleted 
                  ? slotData.attendance === "present" 
                    ? "text-white/90" 
                    : "text-rose-600/80"
                  : "text-slate-500"
              } italic flex items-center gap-1`}>
                  <GraduationCap size={10} className="flex-shrink-0" />
                  <span className="truncate">{slotData.className}</span>
              </div>
            )}

            <div className={`text-[10px] font-bold ${
                slotData?.isCompleted 
                  ? slotData.attendance === "present" 
                    ? "text-white/90" 
                    : "text-rose-600/80"
                  : "text-slate-500"
              } flex items-center gap-1 mt-0.5`}>
                {slotData?.meetingType === "offline" ? (
                  <>
                    <MapPin size={10} className="flex-shrink-0" />
                    <span>Offline</span>
                  </>
                ) : (
                  <>
                    <Video size={10} className="flex-shrink-0" />
                    <span>Online</span>
                  </>
                )}
            </div>


            {/* Nút tham gia Meeting / Xem kết quả */}
            {slotData?.isCompleted ? (
              slotData.wowComment && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(slotData.wowComment, "_blank");
                  }}
                  className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-[10px] py-1.5 rounded-lg flex items-center justify-center transition-all font-bold shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  Chi tiết đánh giá
                </button>
              )
            ) : (
              slotData?.meetingLink && slotData?.meetingType !== "offline" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(slotData.meetingLink, "_blank");
                  }}
                  className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all font-bold shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Video size={14} strokeWidth={3} />
                  Tham gia Meeting
                </button>
              )
            )}
          </>
        </div>
      ) : isOther || isWork || !wowId ? (
        <div className="w-full h-full min-h-[48px] flex items-center justify-center border-2 border-slate-50 bg-slate-50 rounded-lg text-slate-300">
          <span className="font-black select-none">
             <X size={10} strokeWidth={3} />
          </span>
        </div>
      ) : isDeleteBlocked ? (
        <div 
          className="w-full h-full min-h-[48px] flex items-center justify-center border-2 border-slate-50 bg-slate-50 rounded-lg cursor-not-allowed group"
          title="Đã đóng đăng ký/hủy lịch do ca học diễn ra quá gần"
        >
          <span className="text-[12px] text-slate-300 font-bold px-2 text-center select-none transition-colors">
             <X size={10} strokeWidth={3} />
          </span>
        </div>
      ) : isOutOfQuota ? (
        <div 
          className="w-full h-full min-h-[48px] flex items-center justify-center border-2 border-slate-50 bg-slate-50 rounded-lg cursor-not-allowed group relative"
        >
          {/* Thông báo Tooltip */}
          <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 bg-slate-800 text-white text-[11px] px-2 py-1 rounded w-[150px] shadow-lg pointer-events-none transition-opacity text-center z-20">
            Bạn đã dùng hết lượt Quota WOW Của tuần này
            <div className="absolute -bottom-1 left-1/2 -ml-1 border-2 border-transparent border-t-slate-800" />
          </div>
          <span className="text-slate-300 font-black select-none pointer-events-none">
            <X size={10} strokeWidth={3} />
          </span>
        </div>
      ) : (
        <div 
          className="w-full h-full min-h-[48px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg transition-all hover:border-red-400 hover:bg-red-50/50 cursor-pointer shadow-sm group"
          onClick={() => onOpenRegister(dayKey, slotKey)}
        >
          <span className="text-[16px] text-red-500 font-black group-hover:scale-125 transition-transform">
            +
          </span>
        </div>
      )}
    </td>
  );
};
