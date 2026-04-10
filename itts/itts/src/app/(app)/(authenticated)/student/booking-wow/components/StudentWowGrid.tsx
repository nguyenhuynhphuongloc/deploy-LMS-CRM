"use client";
import React, { useMemo, useState, useEffect } from "react";
import { 
  CalendarClock, 
  ChevronLeft, 
  ChevronRight, 
  Sunrise, 
  Sun, 
  Moon,
  Calendar,
  MapPin,
  CheckCircle2
} from "lucide-react";
import { DAYS } from "@/components/ScheduleView/parts/constants";
import { WeekData, ScheduleData, WowAdmin } from "@/components/ScheduleView/parts/types";
import { getMonday, toISODate, formatDate, getDayOfWeek, TIME_SLOTS } from "@/components/ScheduleView/parts/utils";
import { StudentGridCell } from "./StudentGridCell";
import { RegistrationModal } from "@/components/ScheduleView/parts/RegistrationModal";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

interface StudentWowGridProps {
  initialData: ScheduleData;
  wowAdmins: WowAdmin[];
  currentStudentId: string;
  currentStudentName: string;
  currentClassName: string;
  wowQuota: number;
  visibleWeeks: number;
  leadTimeDays: number;
  deleteLeadTimeDays: number;
  maxSlotsPerCell: number;
  onSave: (weekKey: string, weekData: WeekData) => Promise<void>;
  branches: any[];
}

export const StudentWowGrid: React.FC<StudentWowGridProps> = ({
  initialData,
  wowAdmins,
  currentStudentId,
  currentStudentName,
  currentClassName,
  wowQuota,
  visibleWeeks,
  leadTimeDays,
  deleteLeadTimeDays,
  maxSlotsPerCell,
  onSave,
  branches,
}) => {
  const [currentMonday, setCurrentMonday] = useState<Date>(getMonday(new Date()));
  const weekKey = toISODate(currentMonday);
  const scheduleData = initialData[weekKey] ?? {};

  const bookedCountThisWeek = useMemo(() => {
    let count = 0;
    if (scheduleData) {
      Object.values(scheduleData).forEach((dayData: any) => {
        if (dayData?.slots) {
          Object.values(dayData.slots).forEach((slot: any) => {
            if (slot && slot.studentId === currentStudentId && slot.type === "student") {
              count++;
            }
          });
        }
      });
    }
    return count;
  }, [scheduleData, currentStudentId]);

  const remains = wowQuota - bookedCountThisWeek;

  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(["morning", "afternoon", "evening"]);
  const [modal, setModal] = useState({ open: false, dayKey: "", slotKey: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, dayKey: "", slotKey: "" });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [offlineModal, setOfflineModal] = useState({ open: false, branchName: "", address: "" });
  const [form, setForm] = useState({
    registrationType: "student",
    workType: "marketing",
    studentId: currentStudentId,
    studentName: currentStudentName,
    className: currentClassName,
    skill: "speaking",
    testType: "mocktest",
    testDescription: "",
    wowNote: "",
    partTest: "part_1,part_2,part_3",
    meetingType: "online",
  });

  const userForModal = useMemo(() => ({
    id: currentStudentId,
    fullName: currentStudentName,
    role: "student"
  }), [currentStudentId, currentStudentName]);

  // Keep form in sync with automated student details
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      studentId: currentStudentId,
      studentName: currentStudentName,
      className: currentClassName
    }));
  }, [currentStudentId, currentStudentName, currentClassName]);

  const filteredSlots = useMemo(() => {
    return TIME_SLOTS.filter((slot) => {
      const start = slot.split("-")[0] || "";
      const sp = selectedPeriods || [];
      if (sp.includes("morning") && start < "12:30") return true;
      if (sp.includes("afternoon") && start >= "12:30" && start < "17:30") return true;
      if (sp.includes("evening") && start >= "17:30") return true;
      return false;
    });
  }, [selectedPeriods]);

  const gridCols = useMemo(() => {
    const cols: any[] = [];
    DAYS.forEach((day, dayIdx) => {
      const dayData = (scheduleData?.[day.key] || {}) as any;
      const wows = Array.isArray(dayData.wows) ? dayData.wows : [];
      const wowsAfternoon = Array.isArray(dayData.wowsAfternoon) ? dayData.wowsAfternoon : [];
      const wowsEvening = Array.isArray(dayData.wowsEvening) ? dayData.wowsEvening : [];
      
      const activeMorning = wows.length;
      const activeAfternoon = wowsAfternoon.length;
      const activeEvening = wowsEvening.length;
      const maxActive = Math.max(activeMorning, activeAfternoon, activeEvening);
      
      // Luôn hiển thị ít nhất 1 cột ngay cả khi không có WOW
      const numColsToShow = Math.max(1, maxActive);

      for (let i = 0; i < numColsToShow; i++) {
        cols.push({ 
          day, 
          idx: i, 
          colKey: `${day.key}-wow-${i}`, 
          colBg: dayIdx % 2 === 0 ? "bg-white" : "bg-slate-50", 
          dayIdx 
        });
      }
    });
    return cols;
  }, [scheduleData]);

  const openRegister = (dayKey: string, slotKey: string) => {
    // Lấy dữ liệu hiện tại (nếu có) để điền vào form
    const data = getSlotDataWithFallback(dayKey, slotKey);
    
    setForm({
      registrationType: "student",
      workType: data?.workType || "marketing",
      studentId: currentStudentId,
      studentName: currentStudentName,
      className: currentClassName,
      skill: data?.skill || "speaking",
      testType: data?.testType || "mocktest",
      testDescription: data?.testDescription || "",
      wowNote: data?.wowNote || "",
      partTest: data?.partTest || (data?.testType === "mocktest" || !data?.testType ? "part_1,part_2,part_3" : ""),
      meetingType: data?.meetingType || "online",
    });
    setModal({ open: true, dayKey, slotKey });
  };

  const handleSaveRegister = async (formData: any) => {
    setIsSaving(true);
    const { dayKey, slotKey } = modal;
    const updatedWeek: WeekData = JSON.parse(JSON.stringify(scheduleData));
    
    if (!updatedWeek[dayKey]) updatedWeek[dayKey] = { date: "", wows: [], slots: {} };
    if (!updatedWeek[dayKey].slots) updatedWeek[dayKey].slots = {};

    // Get the WOW ID based on the time and column index
    const parts = slotKey.split("_col_");
    const time = parts[0] || "";
    const colIdx = parseInt(parts[1] || "0");
    
    let wowsKey = 'wows' as 'wows' | 'wowsAfternoon' | 'wowsEvening';
    if (time >= "17:30") wowsKey = "wowsEvening";
    else if (time >= "12:30") wowsKey = "wowsAfternoon";
    
    const wowId = updatedWeek[dayKey][wowsKey]?.[colIdx] || "";
    const wowAdmin = wowAdmins.find(w => w.id === wowId);

    updatedWeek[dayKey].slots[slotKey] = {
      registered: true,
      isCompleted: false,
      type: "student",
      studentId: currentStudentId,
      studentName: currentStudentName,
      className: formData.className,
      skill: formData.skill,
      testType: formData.testType,
      testDescription: formData.testDescription,
      wowNote: formData.wowNote,
      partTest: formData.partTest,
      meetingLink: wowAdmin?.meetingLink,
      meetingType: formData.meetingType,
    };

    try {
      if (formData.meetingType === "offline") {
        // Find branch address
        const time = slotKey.split("_col_")[0] || "";
        const colIdx = parseInt(slotKey.split("_col_")[1] || "0");
        let wowsKey = 'wowBranches' as 'wowBranches' | 'wowBranchesAfternoon' | 'wowBranchesEvening';
        if (time >= "17:30") wowsKey = "wowBranchesEvening";
        else if (time >= "12:30") wowsKey = "wowBranchesAfternoon";
        
        const branchName = updatedWeek[dayKey]?.[wowsKey]?.[colIdx] || "";
        const branchInfo = branches.find(b => b.name === branchName);
        
        setOfflineModal({
          open: true,
          branchName: branchName || "Chi nhánh chưa xác định",
          address: branchInfo?.address || "Liên hệ Admin để biết địa chỉ."
        });
      }

      await onSave(weekKey, updatedWeek);
      setForm(formData); 
    } finally {
      setIsSaving(false);
      setModal({ open: false, dayKey: "", slotKey: "" });
    }
  };

  const getSlotDataWithFallback = React.useCallback((dayKey: string, stableSlotKey: string, shiftId?: string) => {
    let data = scheduleData[dayKey]?.slots?.[stableSlotKey];

    if (!data) {
      const parts = stableSlotKey.split("_col_");
      if (parts.length === 2) {
        const time = parts[0] as string;
        const colIdx = parseInt(parts[1] as string);
        
        // Determine shift from time if not provided
        let effectiveShiftId = shiftId;
        if (!effectiveShiftId) {
          if (time >= "17:30") effectiveShiftId = "evening";
          else if (time >= "12:30") effectiveShiftId = "afternoon";
          else effectiveShiftId = "morning";
        }

        const wowsKey = effectiveShiftId === 'morning' ? 'wows' : effectiveShiftId === 'afternoon' ? 'wowsAfternoon' : 'wowsEvening';
        const wowId = (scheduleData[dayKey] as any)?.[wowsKey]?.[colIdx] || "";

        const fallbacks = [
          wowId ? `${time}_${wowId}` : null,
          `${time}_unassigned_${colIdx}`,
          colIdx === 0 ? time : null
        ].filter((f): f is string => !!f && f !== stableSlotKey);

        for (const fb of fallbacks) {
          if (fb && scheduleData[dayKey]?.slots?.[fb]) {
            data = scheduleData[dayKey]?.slots?.[fb];
            break;
          }
        }
      }
    }
    return data;
  }, [scheduleData]);

  const requestRemoveSlot = (dayKey: string, slotKey: string) => {
    setDeleteModal({ open: true, dayKey, slotKey });
  };

  const handleRemoveSlot = async () => {
    const { dayKey, slotKey } = deleteModal;
    setIsDeleting(true);

    // Secondary guard: Block deletion if same-day or earlier
    try {
      if (scheduleData[dayKey]?.date) {
        const [year, month, day] = scheduleData[dayKey].date.split("-").map((num: string) => parseInt(num, 10));
        const slotDate = new Date(year!, month! - 1, day!);
        slotDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limitDate = new Date(today);
        limitDate.setDate(today.getDate() + (deleteLeadTimeDays || 2));

        if (slotDate < limitDate) {
          alert("Không thể hủy lịch học (yêu cầu hủy trước ít nhất 1 ngày).");
          setIsDeleting(false);
          setDeleteModal({ open: false, dayKey: "", slotKey: "" });
          return;
        }
      }
    } catch (e) {
       console.error("Guard check error:", e);
    }

    const updatedWeek: WeekData = JSON.parse(JSON.stringify(scheduleData));
    if (!updatedWeek[dayKey]?.slots) {
       setIsDeleting(false);
       setDeleteModal({ open: false, dayKey: "", slotKey: "" });
       return;
    }

    // Tìm key thực tế để xóa (ưu tiên stable key)
    let keyToDelete = slotKey;
    if (!updatedWeek[dayKey].slots[keyToDelete]) {
      const parts = slotKey.split("_col_");
      if (parts.length === 2) {
        const time = parts[0] as string;
        const colIdx = parseInt(parts[1] as string);
        
        let wowsKey = 'wows' as 'wows' | 'wowsAfternoon' | 'wowsEvening';
        if (time >= "17:30") wowsKey = "wowsEvening";
        else if (time >= "12:30") wowsKey = "wowsAfternoon";
        
        const wowId = updatedWeek[dayKey][wowsKey]?.[colIdx] || "";
        
        const fallbacks = [
          wowId ? `${time}_${wowId}` : null,
          `${time}_unassigned_${colIdx}`,
          colIdx === 0 ? time : null
        ].filter((f): f is string => !!f && f !== slotKey);

        for (const fb of fallbacks) {
          if (fb && updatedWeek[dayKey].slots[fb]) {
            keyToDelete = fb;
            break;
          }
        }
      }
    }

    if (updatedWeek[dayKey]?.slots?.[keyToDelete]) {
     
      (updatedWeek[dayKey].slots as any)[keyToDelete] = null;
      try {
        await onSave(weekKey, updatedWeek);
      } catch (e) {
        console.error("[handleRemoveSlot] Lỗi khi lưu onSave:", e);
      }
    }
    
    setIsDeleting(false);
    setDeleteModal({ open: false, dayKey: "", slotKey: "" });
  };

  const goWeek = (dir: number) => {
    const mondayOfThisWeek = getMonday(new Date());
    const newMonday = new Date(currentMonday);
    newMonday.setDate(newMonday.getDate() + dir * 7);

    // Không cho lùi về các tuần trước tuần hiện tại
    if (newMonday < mondayOfThisWeek) return;

    // Giới hạn số tuần có thể tiến tới
    const maxDate = new Date(mondayOfThisWeek);
    maxDate.setDate(maxDate.getDate() + (visibleWeeks - 1) * 7);
    if (newMonday > maxDate) return;

    setCurrentMonday(newMonday);
  };

  const getWowName = (id: any): string => {
    if (!id) return "WOW";
    const targetId = typeof id === "string" ? id : id?.id;
    const w = wowAdmins.find((a) => {
      const adminId = typeof a.id === "string" ? a.id : (a.id as any)?.id;
      return adminId === targetId;
    });
    return w?.fullName || "WOW";
  };

  // PAN SCROLLING LOGIC
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    // Only drag if clicking on the container or empty space, not on buttons/inputs
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
    
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setStartY(e.pageY - scrollRef.current.offsetTop);
    setScrollLeft(scrollRef.current.scrollLeft);
    setScrollTop(scrollRef.current.scrollTop);
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const y = e.pageY - scrollRef.current.offsetTop;
    const walkX = (x - startX) * 1.5; // Scroll speed
    const walkY = (y - startY) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walkX;
    scrollRef.current.scrollTop = scrollTop - walkY;
  };

  const stopDragging = () => {
    setIsDragging(false);
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'auto';
      scrollRef.current.style.userSelect = 'auto';
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm flex flex-col h-full">
      {/* PERIOD FILTER */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-slate-100 flex-shrink-0">
        <div className="flex gap-2">
          {[
            { key: "morning", label: "Ca sáng (09:00 - 12:30)", icon: Sunrise, color: "bg-amber-400" },
            { key: "afternoon", label: "Ca chiều (12:30 - 17:30)", icon: Sun, color: "bg-sky-400" },
            { key: "evening", label: "Ca tối (17:30 - 21:30)", icon: Moon, color: "bg-indigo-500" },
          ].map((p) => {
            const active = selectedPeriods.includes(p.key);
            return (
              <button
                key={p.key}
                onClick={() => setSelectedPeriods(prev => active ? prev.filter(k => k !== p.key) : [...prev, p.key])}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                  active ? `${p.color} text-white border-transparent shadow-sm` : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"
                }`}
              >
                <p.icon size={14} />
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
            <div className={`flex items-center rounded-lg p-1.5 border shadow-sm text-sm font-bold ${
              remains > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"
            }`}>
              Số lượt WOW: {(remains < 0 ? 0 : remains)} / {wowQuota} lượt
            </div>
                <div className="px-3 py-1.5 font-bold min-w-[250px] text-center text-slate-700 text-sm flex items-center justify-between gap-4">
                    <button 
                      onClick={() => goWeek(-1)}
                      className={`p-1 hover:bg-slate-200 rounded-md transition-colors ${currentMonday <= getMonday(new Date()) ? 'opacity-30 cursor-not-allowed' : ''}`}
                      disabled={currentMonday <= getMonday(new Date())}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>
                        {(() => {
                            const sunday = new Date(currentMonday);
                            sunday.setDate(sunday.getDate() + 6);
                            
                            // Lấy format dd/MM/yyyy
                            const startFormat = formatDate(currentMonday);
                            const endFormat = formatDate(sunday);
                            
                            return `${startFormat} - ${endFormat}`;
                        })()}
                    </span>
                    <button 
                      onClick={() => goWeek(1)}
                      className={`p-1 hover:bg-slate-200 rounded-md transition-colors ${(() => {
                        const mondayOfThisWeek = getMonday(new Date());
                        const maxDate = new Date(mondayOfThisWeek);
                        maxDate.setDate(maxDate.getDate() + (visibleWeeks - 1) * 7);
                        return currentMonday >= maxDate;
                      })() ? 'opacity-30 cursor-not-allowed' : ''}`}
                      disabled={(() => {
                        const mondayOfThisWeek = getMonday(new Date());
                        const maxDate = new Date(mondayOfThisWeek);
                        maxDate.setDate(maxDate.getDate() + (visibleWeeks - 1) * 7);
                        return currentMonday >= maxDate;
                      })()}
                    >
                      <ChevronRight size={16} />
                    </button>
                </div>
        </div>
      </div>

      {/* GRID */}
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        className="flex-1 overflow-auto custom-scrollbar relative p-1 active:cursor-grabbing cursor-grab"
      >
        <table className="w-full border-separate border-spacing-[2px] min-w-[1200px] select-none">
          <thead>
            {/* Row 1: Day headers */}
            <tr className="bg-slate-100 shadow-sm border-b border-slate-200">
              <th 
                className="w-[100px] min-w-[100px] sticky top-0 left-0 z-50 bg-slate-100 border-b-2 border-slate-300 p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider h-[58px] shadow-[2px_0_5px_rgba(0,0,0,0.05)] pointer-events-none"
              >
                Giờ
              </th>
              {DAYS.map((day, dayIdx) => {
                const dayData = (scheduleData?.[day.key] || {}) as any;
                const wows = Array.isArray(dayData.wows) ? dayData.wows : [];
                const wowsAfternoon = Array.isArray(dayData.wowsAfternoon) ? dayData.wowsAfternoon : [];
                const wowsEvening = Array.isArray(dayData.wowsEvening) ? dayData.wowsEvening : [];
                
                const activeMorning = wows.length;
                const activeAfternoon = wowsAfternoon.length;
                const activeEvening = wowsEvening.length;
                const maxActive = Math.max(activeMorning, activeAfternoon, activeEvening);
                
                const numCols = Math.max(1, maxActive);

                let rawDateStr = dayData.date || "";
                let dateStr = rawDateStr;
                if (rawDateStr && rawDateStr.includes("-")) {
                   const parts = rawDateStr.split("-");
                   if (parts.length === 3) {
                     dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
                   }
                }
                const headerBg = dayIdx % 2 === 0 ? "bg-white" : "bg-slate-100";
                return (
                  <th
                    key={day.key}
                    colSpan={numCols}
                    className={`px-2 py-2 text-center border-r border-slate-200 border-b-2 border-b-slate-300 ${headerBg} ${day.headerBorder} h-[58px] shadow-sm pointer-events-none sticky top-0 z-40`}
                  >
                    <div className="text-[13px] font-bold text-slate-800">
                      {day.label}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">
                      {dateStr}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="cursor-pointer">
            {[
              { id: 'morning', label: 'CA SÁNG (09:00 - 12:30)', slots: filteredSlots.filter(s => (s.split("-")[0] || "") < "12:30") },
              { id: 'afternoon', label: 'CA CHIỀU (12:30 - 17:30)', slots: filteredSlots.filter(s => {
                  const t = s.split("-")[0] || "";
                  return t >= "12:30" && t < "17:30";
                }) 
              },
              { id: 'evening', label: 'CA TỐI (17:30 - 21:30)', slots: filteredSlots.filter(s => (s.split("-")[0] || "") >= "17:30") },
            ].filter(sh => sh.slots.length > 0).map((shiftInfo) => {
              const headerColors: any = {
                morning: { main: "bg-amber-400", sticky: "bg-amber-400", border: "border-amber-500" },
                afternoon: { main: "bg-sky-400", sticky: "bg-sky-400", border: "border-sky-500" },
                evening: { main: "bg-indigo-500", sticky: "bg-indigo-500", border: "border-indigo-600" },
              };
              const colors = headerColors[shiftInfo.id] || { main: "bg-red-500", sticky: "bg-red-600", border: "border-red-700" };

              return (
                <React.Fragment key={shiftInfo.id}>
                  {/* Shift Divider Row */}
                  <tr className={`${colors.main} text-white font-bold h-[32px] pointer-events-none`}>
                    <td className={`sticky left-0 z-10 ${colors.sticky} text-center text-[10px] uppercase tracking-wider border-r ${colors.border} shadow-[1px_0_3px_rgba(0,0,0,0.1)]`}>
                      {shiftInfo.id === 'morning' ? 'Sáng' : shiftInfo.id === 'afternoon' ? 'Chiều' : 'Tối'}
                    </td>
                    <td colSpan={gridCols.length} className="px-4 text-[11px] uppercase tracking-[0.2em]">
                      {shiftInfo.label}
                    </td>
                  </tr>

                  {/* WOW Header Row for this Shift */}
                  <tr className="shadow-sm surface-shadow border-b border-slate-200">
                    <td className="sticky left-0 z-20 bg-slate-50 border-r border-slate-200" />
                    {gridCols.map((col) => {
                       const dayData = (scheduleData?.[col.day.key] || {}) as any;
                       const wowsKey = shiftInfo.id === 'morning' ? 'wows' : shiftInfo.id === 'afternoon' ? 'wowsAfternoon' : 'wowsEvening';
                       const branchesKey = shiftInfo.id === 'morning' ? 'wowBranches' : shiftInfo.id === 'afternoon' ? 'wowBranchesAfternoon' : 'wowBranchesEvening';
                       const wowsArray = dayData[wowsKey] || [];
                       const branchesArray = dayData[branchesKey] || [];
                       const wowId = col.idx < wowsArray.length ? wowsArray[col.idx] : null;
                       const branch = branchesArray[col.idx] || "";

                       return (
                        <th key={`${col.colKey}-${shiftInfo.id}`} className={`min-w-[150px] border-b border-slate-200 p-2 bg-slate-100 pointer-events-none`}>
                            {wowId ? (
                              <div className="flex flex-col items-center justify-center gap-1.5 py-2 min-h-[72px]">
                                <div className="text-[12px] px-4 py-1.5 font-bold whitespace-nowrap rounded-lg shadow-sm block bg-red-500 text-white border border-red-600 text-center w-full">
                                    WOW: {getWowName(wowId)}
                                </div>
                                {branch ? (
                                  <div className="text-[10px] font-bold text-white bg-blue-500 px-3 py-1 rounded-full border border-blue-600 shadow-sm truncate max-w-full">
                                    {branch}
                                  </div>
                                ) : (
                                  <div className="h-[21px]" />
                                )}
                              </div>
                            ) : (
                              <div className="min-h-[72px] flex items-center justify-center" />
                            )}
                        </th>
                       );
                    })}
                  </tr>

                  {shiftInfo.slots.map((slot) => (
                    <tr key={slot}>
                      <td className="sticky left-0 z-10 bg-white border-r border-slate-200 p-2 text-center h-[60px] shadow-[1px_0_3px_rgba(0,0,0,0.05)] pointer-events-none">
                        <span className="text-[11px] font-black text-slate-600 whitespace-nowrap block w-full px-1">{slot.replace("-", " – ")}</span>
                      </td>
                      {gridCols.map((col) => {
                        const dayData = (scheduleData?.[col.day.key] || {}) as any;
                        const wowsKey = shiftInfo.id === 'morning' ? 'wows' : shiftInfo.id === 'afternoon' ? 'wowsAfternoon' : 'wowsEvening';
                        const wowsArray = dayData[wowsKey] || [];
                        const wowId = col.idx < wowsArray.length ? wowsArray[col.idx] : null;

                        const slotKey = `${slot.split("-")[0]}_col_${col.idx}`;
                        const slotData = getSlotDataWithFallback(col.day.key, slotKey, shiftInfo.id);
                        
                        const cellDate = new Date(currentMonday);
                        cellDate.setDate(cellDate.getDate() + col.dayIdx);
                        const dateStr = [
                          cellDate.getFullYear(),
                          String(cellDate.getMonth() + 1).padStart(2, "0"),
                          String(cellDate.getDate()).padStart(2, "0"),
                        ].join("-");

                        return (
                          <StudentGridCell
                            key={`${col.colKey}-${slot}-${shiftInfo.id}`}
                            dayKey={col.day.key}
                            dateStr={dateStr}
                            slotKey={slotKey}
                            wowId={wowId || ""}
                            slotData={slotData}
                            currentStudentId={currentStudentId}
                            remains={remains}
                            onOpenRegister={openRegister}
                            onRemoveSlot={requestRemoveSlot}
                            columnBg={col.colBg}
                            leadTimeDays={leadTimeDays}
                            deleteLeadTimeDays={deleteLeadTimeDays}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <RegistrationModal
          open={modal.open}
          dayKey={modal.dayKey}
          slotKey={modal.slotKey}
          onClose={() => !isSaving && setModal({ ...modal, open: false })}
          onSave={handleSaveRegister}
          form={form}
          user={userForModal}
          readOnly={true}
          isLoading={isSaving}
        />
      )}

      <DeleteConfirmationModal
        open={deleteModal.open}
        onClose={() => {
           if (!isDeleting) setDeleteModal({ ...deleteModal, open: false });
        }}
        onConfirm={handleRemoveSlot}
        isLoading={isDeleting}
      />

      {/* Offline Address Modal */}
      {offlineModal.open && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-300 border border-slate-100">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6 shadow-inner">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
                Đăng ký thành công!
              </h3>
              
              <div className="bg-slate-50 rounded-xl p-5 mb-8 w-full border border-slate-100">
                <p className="text-slate-600 text-[13px] font-medium mb-3 leading-relaxed">
                  Bạn đã chọn hình thức <span className="text-red-600 font-bold uppercase">Offline</span>. Vui lòng thực hiện ca WOW tại địa chỉ sau:
                </p>
                
                <div className="flex items-start gap-3 text-left">
                  <div className="mt-1 bg-red-100 p-1.5 rounded-lg">
                    <MapPin className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 mb-0.5 uppercase tracking-wide">
                      {offlineModal.branchName}
                    </div>
                    <div className="text-[13px] font-medium text-slate-500 leading-snug">
                      {offlineModal.address}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setOfflineModal({ ...offlineModal, open: false })}
                className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 uppercase tracking-widest"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
