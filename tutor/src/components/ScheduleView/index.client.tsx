"use client";
import { useRealtime } from "@/hooks/useRealtime";
import { ROLES } from "@/payload/access";
import { useAuth, usePayloadAPI } from "@payloadcms/ui";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Sun,
  Sunrise,
  X,
  AlertTriangle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DAYS,
  DEFAULT_SKILL_COLOR,
  SCROLL_SPEED,
  SCROLL_THRESHOLD,
  SKILL_COLORS,
  TEST_TYPE_COLORS,
} from "./parts/constants";
import {
  DraggedSlot,
  ModalState,
  ScheduleData,
  SlotData,
  WeekData,
  WowAdmin,
  WowModalState,
} from "./parts/types";
import {
  formatDate,
  getDayOfWeek,
  getMonday,
  TIME_SLOTS,
  toISODate,
} from "./parts/utils";

// Components
import { GridCell } from "./parts/GridCell";
import { RegistrationModal } from "./parts/RegistrationModal";
import { ResultModal } from "./parts/ResultModal";
import { WowAssignmentModal } from "./parts/WowAssignmentModal";

/* ============ COMPONENT ============ */
export default function ScheduleViewClient() {
  const collectionSlug = "booking_schedule";
  const { user } = useAuth();

  const [id, setId] = useState<string | null>(null);
  const [allData, setAllData] = useState<ScheduleData>({});

  const [isFormModified, setModified] = useState(false);

  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState<any>({
    visibleWeeks: "",
    leadTimeDays: "",
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch(
          `/api/${collectionSlug}?limit=1&sort=-createdAt`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.docs && data.docs.length > 0) {
            const doc = data.docs[0];
            setId(doc.id);
            if (doc.schedule_data) {
              setAllData(
                typeof doc.schedule_data === "string"
                  ? JSON.parse(doc.schedule_data)
                  : doc.schedule_data,
              );
            }
            if (doc.wow_manager_config) {
              setConfigForm({
                visibleWeeks: doc.wow_manager_config.visibleWeeks ?? "",
                leadTimeDays: doc.wow_manager_config.leadTimeDays ?? "",
              });
            }
          }
        }
      } catch (e) {
        console.error("Fetch schedule err", e);
      }
    };
    fetchInitialData();
  }, []);

  const isAdmin = user?.role === ROLES.ADMIN;
  const isWowManager = user?.role === ROLES.WOW_MANAGER;
  const isWowExecutive = user?.role === ROLES.WOW_EXECUTIVE;
  const isFullTimeTeacher = user?.role === ROLES.TEACHER_FULL_TIME;
  const isPartTimeTeacher = user?.role === ROLES.TEACHER_PART_TIME;

  const canManageWowColumns = isAdmin || isWowManager; 
  const canAssignWow = isAdmin || isWowManager || isWowExecutive;
  const canDeleteWow = isAdmin || isWowManager || isWowExecutive;

  const canManageSlots = (colWowId: string | null) => {
    if (isAdmin || isWowManager || isWowExecutive || isFullTimeTeacher || isPartTimeTeacher) return true;
    return false;
  };

  const [currentMonday, setCurrentMonday] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const monday = getMonday(new Date());
    setCurrentMonday(monday);
    setMounted(true);
  }, []);

  const weekKey = currentMonday ? toISODate(currentMonday) : "";

  const scheduleData: WeekData = useMemo(() => {
    return allData[weekKey] ?? {};
  }, [allData, weekKey]);

  const saveWeek = useCallback(
    async (wKey: string, weekData: WeekData) => {
      if (!id) return;
      
      // Update local state first for responsiveness
      const updatedAllData = { ...allData, [wKey]: weekData };
      setAllData(updatedAllData);

      try {
        const res = await fetch(`/api/${collectionSlug}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedule_data: updatedAllData }),
        });
        
        if (!res.ok) {
          throw new Error("Failed to save schedule");
        }
      } catch (err) {
        console.error("Save schedule err", err);
        // Optional: revert local state if server sync fails
        // For now, we trust the error handling in callers
        throw err;
      }
      
      setModified(true);
      setTimeout(() => setModified(false), 1000);
    },
    [id, allData, collectionSlug],
  );

  const initWeek = useCallback(
    (monday: Date) => {
      const wk = toISODate(monday);
      if (allData[wk] && DAYS.every((d) => allData[wk]?.[d.key]?.date)) return;
      const newWeek: WeekData = {};
      DAYS.forEach((day, i) => {
        const date = getDayOfWeek(monday, i);
        const existing = allData[wk]?.[day.key];
        newWeek[day.key] = {
          date: existing?.date || formatDate(date),
          wows: existing?.wows || [],
          wowsAfternoon: existing?.wowsAfternoon || [],
          wowsEvening: existing?.wowsEvening || [],
          slots: existing?.slots || {},
        };
      });
      saveWeek(wk, newWeek);
    },
    [allData, saveWeek],
  );

  useEffect(() => {
    if (!currentMonday) return;
    initWeek(currentMonday);
  }, [weekKey]);

  const goWeek = (dir: number) => {
    if (!currentMonday) return;
    const newMonday = new Date(currentMonday);
    newMonday.setDate(newMonday.getDate() + dir * 7);
    setCurrentMonday(newMonday);
  };

  useRealtime(async (data) => {
    const fetchLatest = async (): Promise<boolean> => {
      if (document.visibilityState === "visible" && !isFormModified && id) {
        try {
          const res = await fetch(
            `/api/${collectionSlug}/${id}?depth=0&t=${Date.now()}`,
            {
              cache: "no-store",
              headers: {
                Pragma: "no-cache",
                "Cache-Control": "no-cache",
              },
            },
          );

          if (res.ok) {
            const latestDoc = await res.json();
            const newData = latestDoc?.schedule_data || {};
            const prevStr = JSON.stringify(allData);
            const nextStr = JSON.stringify(newData);

            if (prevStr !== nextStr) {
              console.log("[Real-time] Đã thấy thay đổi, cập nhật Admin Grid.");
              setModified(false);
              setAllData(newData);
              return true;
            }
          }
        } catch (err) {
          console.error("Real-time update failed:", err);
        }
      }
      return false;
    };

    const signalTime = data?.updatedAt || "";
    const isNew = await fetchLatest();

    if (!isNew && !isFormModified) {
      setTimeout(() => {
        void fetchLatest();
      }, 700);
    }
  });

  const saveConfig = async () => {
    if (!id) return;
    setIsSavingConfig(true);
    try {
      const dataToSave = {
        visibleWeeks:
          configForm.visibleWeeks === ""
            ? 2
            : parseInt(configForm.visibleWeeks),
        leadTimeDays:
          configForm.leadTimeDays === ""
            ? 1
            : parseInt(configForm.leadTimeDays),
      };

      const res = await fetch(`/api/${collectionSlug}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wow_manager_config: dataToSave }),
      });
      if (res.ok) {
        setShowConfig(false);
        // Refresh data to be safe
        window.location.reload();
      } else {
        alert("Lỗi khi lưu cấu hình");
      }
    } catch (err) {
      console.error("Save config err", err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  /* === Fetch WOW admins === */
  const [{ data: wowRes }] = usePayloadAPI(
    `/api/admins?where[or][0][role][equals]=${ROLES.WOW_MANAGER}&where[or][1][role][equals]=${ROLES.WOW_EXECUTIVE}&where[or][2][role][equals]=${ROLES.ADMIN}&depth=0&limit=1000`,
    {},
  );
  const wowAdmins: WowAdmin[] = useMemo(() => {
    const docs = (wowRes?.docs ?? []) as WowAdmin[];
    // Khử trùng lặp theo ID giáo viên
    const uniqueMap = new Map();
    docs.forEach((d) => {
      if (d.id) uniqueMap.set(d.id, d);
    });
    return Array.from(uniqueMap.values());
  }, [wowRes]);

  /* === Fetch Branches === */
  const [{ data: branchRes }] = usePayloadAPI(
    "/api/branches?depth=0&limit=100",
    {},
  );
  const branches = useMemo(() => (branchRes?.docs ?? []) as any[], [branchRes]);

  const [branchSelection, setBranchSelection] = useState<{
    open: boolean;
    dayKey: string;
    idx: number;
    currentValue: string;
    shift?: "morning" | "afternoon" | "evening";
  }>({
    open: false,
    dayKey: "",
    idx: 0,
    currentValue: "",
    shift: "morning",
  });

  const [modal, setModal] = useState<ModalState>({
    open: false,
    dayKey: "",
    slotKey: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingWow, setIsSavingWow] = useState(false);
  const [form, setForm] = useState({
    registrationType: "student",
    workType: "marketing",
    studentId: "",
    studentName: "",
    className: "", // Tên lớp
    skill: "speaking",
    testType: "midterm",
    testDescription: "",
    wowNote: "",
    partTest: "",
    meetingType: "online",
  });

  /* === Test Result Model === */
  const [resultModal, setResultModal] = useState<{
    open: boolean;
    dayKey: string;
    slotKey: string;
  }>({
    open: false,
    dayKey: "",
    slotKey: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    dayKey: string;
    shift: "morning" | "afternoon" | "evening";
    colIdx: number;
    hasRegistrations: boolean;
  }>({
    open: false,
    dayKey: "",
    shift: "morning",
    colIdx: 0,
    hasRegistrations: false,
  });
  const [resultForm, setResultForm] = useState({
    attendance: "present" as SlotData["attendance"],
    s1: 0,
    s2: 0,
    s3: 0,
    s4: 0,
    overall: "",
    wowComment: "",
  });

  const [regDeleteConfirm, setRegDeleteConfirm] = useState<{
    open: boolean;
    dayKey: string;
    slotKey: string;
    studentName: string;
    className: string;
  }>({
    open: false,
    dayKey: "",
    slotKey: "",
    studentName: "",
    className: "",
  });

  const getSlotDataWithFallback = useCallback(
    (dayKey: string, stableSlotKey: string) => {
      let data = scheduleData[dayKey]?.slots?.[stableSlotKey];

      if (!data) {
        const parts = stableSlotKey.split("_col_");
        if (parts.length === 2) {
          const time = parts[0];
          const colIdx = parseInt(parts[1]!);
          const wowId = scheduleData[dayKey]?.wows?.[colIdx] || "";

          const fallbacks = [
            wowId ? `${time}_${wowId}` : null,
            `${time}_unassigned_${colIdx}`,
            colIdx === 0 ? time : null,
          ].filter((f) => f && f !== stableSlotKey) as string[];

          for (const fb of fallbacks) {
            if (scheduleData[dayKey]?.slots?.[fb]) {
              data = scheduleData[dayKey]!.slots![fb];
              break;
            }
          }
        }
      }
      return data;
    },
    [scheduleData],
  );

  const openResult = (dayKey: string, slotKey: string) => {
    let data = getSlotDataWithFallback(dayKey, slotKey);

    if (data) {
      setResultForm({
        attendance: data.attendance || "present",
        s1: data.s1 || 0,
        s2: data.s2 || 0,
        s3: data.s3 || 0,
        s4: data.s4 || 0,
        overall: data.overall || "",
        wowComment: data.wowComment || "",
      });
    } else {
      setResultForm({
        attendance: "present",
        s1: 0,
        s2: 0,
        s3: 0,
        s4: 0,
        overall: "",
        wowComment: "",
      });
    }
    setResultModal({ open: true, dayKey, slotKey });
  };

  const saveResult = async (formData: any) => {
    const { dayKey, slotKey } = resultModal;

    const latestDoc = await getLatestDocument();
    const latestSlot =
      latestDoc?.schedule_data?.[weekKey]?.[dayKey]?.slots?.[slotKey];
    if (latestSlot?.isCompleted) {
      alert(
        `Xung đột dữ liệu!\n\nKết quả cho ca này vừa được cập nhật bởi người khác.\nTrang sẽ tự động tải lại.`,
      );
      window.location.reload();
      return;
    }

    const updatedWeek: WeekData = JSON.parse(JSON.stringify(scheduleData));
    const formToUse = formData;

    if (!updatedWeek[dayKey])
      updatedWeek[dayKey] = { date: "", wows: [], slots: {} };
    if (!updatedWeek[dayKey].slots) updatedWeek[dayKey].slots = {};

    const parts = slotKey.split("_col_");
    const time = parts[0];
    const colIdx = parseInt(parts[1]!);
    const wowId = updatedWeek[dayKey].wows[colIdx] || "";

    const fallbacks = [
      wowId ? `${time}_${wowId}` : null,
      `${time}_unassigned_${colIdx}`,
      colIdx === 0 ? time : null,
    ].filter((f) => f && f !== slotKey) as string[];

    fallbacks.forEach((fb) => {
      if (updatedWeek[dayKey]?.slots) delete updatedWeek[dayKey]!.slots![fb];
    });

    if (updatedWeek[dayKey]?.slots?.[slotKey]) {
      updatedWeek[dayKey].slots[slotKey] = {
        ...updatedWeek[dayKey].slots[slotKey],
        isCompleted: true,
        attendance: formToUse.attendance,
        s1: formToUse.s1,
        s2: formToUse.s2,
        s3: formToUse.s3,
        s4: formToUse.s4,
        overall: formToUse.overall,
        wowComment: formToUse.wowComment,
      };
    } else {
      // If slot didn't exist, create it with default registered:true
      updatedWeek[dayKey].slots[slotKey] = {
        registered: true,
        isCompleted: true,
        type: "student", // Default type if creating from result
        attendance: formToUse.attendance,
        s1: formToUse.s1,
        s2: formToUse.s2,
        s3: formToUse.s3,
        s4: formToUse.s4,
        overall: formToUse.overall,
        wowComment: formToUse.wowComment,
      };
    }
    await saveWeek(weekKey, updatedWeek);
    setResultModal({ open: false, dayKey: "", slotKey: "" });
  };

  const openRegister = (dayKey: string, slotKey: string) => {
    // slotKey is the stable key
    let data = getSlotDataWithFallback(dayKey, slotKey);

    if (data?.registered) return; // Cannot register if already registered

    setForm({
      registrationType: data?.type || "student",
      workType: data?.workType || "marketing",
      studentId: data?.studentId || "",
      studentName: data?.studentName || "",
      className: data?.className || "",
      skill: data?.skill || "speaking",
      testType: data?.testType || "mocktest",
      testDescription: data?.testDescription || "",
      wowNote: data?.wowNote || "",
      partTest: data?.partTest || (data?.testType === "mocktest" || !data?.testType ? "part_1,part_2,part_3" : ""),
      meetingType: data?.meetingType || "online",
    });
    setModal({ open: true, dayKey, slotKey });
  };

  const saveRegister = async (formData: any) => {
    setIsSaving(true);
    const { dayKey, slotKey } = modal;

    // Concurrency Check
    const latestDoc = await getLatestDocument();
    const latestSlot =
      latestDoc?.schedule_data?.[weekKey]?.[dayKey]?.slots?.[slotKey];
    if (latestSlot?.registered) {
      alert(
        `⚠️ Xung đột!\n\nCa này vừa được đăng ký bởi "${latestSlot.studentName}".\nTrang sẽ tự động tải lại.`,
      );
      setIsSaving(false);
      window.location.reload();
      return;
    }

    const updatedWeek: WeekData = JSON.parse(JSON.stringify(scheduleData));
    if (!updatedWeek[dayKey])
      updatedWeek[dayKey] = { date: "", wows: [], slots: {} };
    if (!updatedWeek[dayKey].slots) updatedWeek[dayKey].slots = {};

    const parts = slotKey.split("_col_");
    const time = parts[0];
    const colIdx = parseInt(parts[1]!);
    const wowId = updatedWeek[dayKey].wows[colIdx] || "";

    const fallbacks = [
      wowId ? `${time}_${wowId}` : null,
      `${time}_unassigned_${colIdx}`,
      colIdx === 0 ? time : null,
    ].filter((f) => f && f !== slotKey) as string[];

    fallbacks.forEach((fb) => {
      if (updatedWeek[dayKey]?.slots) delete updatedWeek[dayKey]!.slots![fb];
    });

    updatedWeek[dayKey].slots[slotKey] = {
      registered: true,
      isCompleted: false,
      type: formData.registrationType as any,
      ...(formData.registrationType === "student"
        ? {
            studentId: formData.studentId,
            studentName: formData.studentName,
            className: formData.className,
            skill: formData.skill,
            testType: formData.testType as any,
            testDescription: formData.testDescription,
            wowNote: formData.wowNote,
            partTest: formData.partTest,
            meetingType: formData.meetingType,
          }
        : {
            workType: formData.workType as any,
          }),
    };
    await saveWeek(weekKey, updatedWeek);
    setIsSaving(false);
    setModal({ open: false, dayKey: "", slotKey: "" });
  };

  const removeSlot = (dayKey: string, slotKey: string) => {
    const data = getSlotDataWithFallback(dayKey, slotKey);
    if (data?.registered && data.type === "student") {
      setRegDeleteConfirm({
        open: true,
        dayKey,
        slotKey,
        studentName: data.studentName || "N/A",
        className: data.className || "N/A",
      });
    } else {
      confirmRemoveSlot(dayKey, slotKey);
    }
  };

  const confirmRemoveSlot = async (dayKey: string, slotKey: string) => {
    const updatedWeek: WeekData = JSON.parse(JSON.stringify(scheduleData));
    if (!updatedWeek[dayKey]?.slots) return;

    let keyToDelete = slotKey;
    if (!updatedWeek[dayKey].slots[keyToDelete]) {
      const parts = slotKey.split("_col_");
      if (parts.length === 2) {
        const time = parts[0];
        const colIdx = parseInt(parts[1]!);
        const wowId = updatedWeek[dayKey]?.wows?.[colIdx] || "";

        const fallbacks = [
          wowId ? `${time}_${wowId}` : null,
          `${time}_unassigned_${colIdx}`,
          colIdx === 0 ? time : null,
        ].filter((f) => f && f !== slotKey) as string[];

        for (const fb of fallbacks) {
          if (updatedWeek[dayKey]?.slots?.[fb]) {
            keyToDelete = fb;
            break;
          }
        }
      }
    }

    if (updatedWeek[dayKey]?.slots?.[keyToDelete]) {
      delete updatedWeek[dayKey]!.slots[keyToDelete];
    }
    await saveWeek(weekKey, updatedWeek);
    setRegDeleteConfirm((prev) => ({ ...prev, open: false }));
  };

  /* === Drag and Drop === */
  const [draggedSlot, setDraggedSlot] = useState<DraggedSlot | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    dayKey: string;
    slotKey: string;
  } | null>(null);

  const handleMoveSlot = (
    source: DraggedSlot,
    targetDayKey: string,
    targetSlotKey: string,
  ) => {
    if (source.dayKey === targetDayKey && source.slotKey === targetSlotKey)
      return;

    const updatedWeek: WeekData = JSON.parse(JSON.stringify(scheduleData));

    // Find the actual source data (checking fallbacks) and delete it
    let sourceData: SlotData | undefined;
    let sourceKeyToDelete = source.slotKey;

    if (updatedWeek[source.dayKey]?.slots?.[source.slotKey]) {
      sourceData = updatedWeek[source.dayKey]!.slots![source.slotKey];
      delete updatedWeek[source.dayKey]!.slots![source.slotKey];
    } else {
      const parts = source.slotKey.split("_col_");
      if (parts.length === 2) {
        const time = parts[0];
        const colIdx = parseInt(parts[1]!);
        const wowId = updatedWeek[source.dayKey]?.wows?.[colIdx] || "";
        const fallbacks = [
          wowId ? `${time}_${wowId}` : null,
          `${time}_unassigned_${colIdx}`,
          colIdx === 0 ? time : null,
        ].filter((f) => f && f !== source.slotKey) as string[];

        for (const fb of fallbacks) {
          if (updatedWeek[source.dayKey]?.slots?.[fb]) {
            sourceData = updatedWeek[source.dayKey]!.slots![fb];
            sourceKeyToDelete = fb;
            delete updatedWeek[source.dayKey]!.slots![fb]; // Clean up while moving
            break;
          }
        }
      }
    }

    if (!sourceData) return;

    if (!updatedWeek[targetDayKey])
      updatedWeek[targetDayKey] = { date: "", wows: [], slots: {} };
    if (!updatedWeek[targetDayKey].slots) updatedWeek[targetDayKey].slots = {};

    // Ensure target uses stable key and clean up target legacy keys
    const tParts = targetSlotKey.split("_col_");
    if (tParts.length === 2) {
      const tTime = tParts[0];
      const tColIdx = parseInt(tParts[1]!);
      const tWowId = updatedWeek[targetDayKey].wows[tColIdx] || "";
      const tFallbacks = [
        tWowId ? `${tTime}_${tWowId}` : null,
        `${tTime}_unassigned_${tColIdx}`,
        tColIdx === 0 ? tTime : null,
      ].filter((f) => f && f !== targetSlotKey) as string[];

      tFallbacks.forEach((fb) => {
        if (updatedWeek[targetDayKey]?.slots)
          delete updatedWeek[targetDayKey]!.slots![fb];
      });
    }

    updatedWeek[targetDayKey].slots[targetSlotKey] = sourceData;
    saveWeek(weekKey, updatedWeek);
    setDraggedSlot(null);
    setDragOverTarget(null);
  };

  const scrollInterval = useRef<NodeJS.Timeout | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current);
      scrollInterval.current = null;
    }
  }, [scrollInterval]);

  const startAutoScroll = useCallback(
    (direction: number) => {
      if (scrollInterval.current) return;
      scrollInterval.current = setInterval(() => {
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollTop += direction * SCROLL_SPEED;
        }
      }, 20);
    },
    [scrollInterval],
  );

  const handleContainerDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!draggedSlot || !mainScrollRef.current) return;

      const rect = mainScrollRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;

      if (relativeY < SCROLL_THRESHOLD) {
        startAutoScroll(-1);
      } else if (relativeY > rect.height - SCROLL_THRESHOLD) {
        startAutoScroll(1);
      } else {
        stopAutoScroll();
      }
    },
    [draggedSlot, startAutoScroll, stopAutoScroll],
  );

  useEffect(() => {
    return () => stopAutoScroll();
  }, [stopAutoScroll]);

  /* === WOW assignment modal === */
  const [wowModal, setWowModal] = useState<WowModalState>({
    open: false,
    dayKey: "",
    shift: "morning",
  });
  // Removed addWowColModal state
  const [selectedWows, setSelectedWows] = useState<string[]>([]);

  const openWowModal = async (dayKey: string, shift: "morning" | "afternoon" | "evening" = "morning", wowIndex?: number) => {
    // Nếu là nhân viên thực thi (không phải manager/admin), tự động gán bản thân vào ô đó
    const isExecutiveOnly = (isWowExecutive || isFullTimeTeacher || isPartTimeTeacher) && !isWowManager && !isAdmin;
    
    if (isExecutiveOnly) {
      if (!user?.id) return;
      const updatedWeek: WeekData = JSON.parse(JSON.stringify(scheduleData));
      const day = updatedWeek[dayKey];
      if (!day) return;
      
      const wKey = shift === "morning" ? "wows" : shift === "afternoon" ? "wowsAfternoon" : "wowsEvening";
      if (!Array.isArray(day[wKey])) day[wKey] = [];
      
      // Gán ID của chính mình vào ô đang chọn
      day[wKey][wowIndex || 0] = user.id;
      await saveWeek(weekKey, updatedWeek);
      return;
    }

    const wowsKey = shift === "morning" ? "wows" : shift === "afternoon" ? "wowsAfternoon" : "wowsEvening";
    const currentWows = scheduleData[dayKey]?.[wowsKey] || [];
    setSelectedWows(currentWows);
    setWowModal({ open: true, dayKey, shift, wowIndex });
  };

  const addWowColumn = async (dayKey: string) => {
    const updatedWeek: WeekData = JSON.parse(JSON.stringify(scheduleData));
    if (!updatedWeek[dayKey]) {
      updatedWeek[dayKey] = { date: "", wows: [], slots: {}, wowsAfternoon: [], wowsEvening: [] };
    }
    
    const day = updatedWeek[dayKey];
    const shiftKeys: Array<"wows" | "wowsAfternoon" | "wowsEvening"> = ["wows", "wowsAfternoon", "wowsEvening"];
    
    shiftKeys.forEach(k => {
      if (!Array.isArray(day[k])) day[k] = [];
      day[k].push("");
    });

    await saveWeek(weekKey, updatedWeek);
  };

  const checkColumnHasRegistrations = (dayKey: string, colIdx: number): boolean => {
    const day = scheduleData[dayKey];
    if (!day || !day.slots) return false;
    
    return Object.keys(day.slots).some(key => {
      const parts = key.split("_col_");
      if (parts.length === 2 && parseInt(parts[1]!) === colIdx) {
        const slotData = day.slots![key];
        return !!slotData?.registered;
      }
      return false;
    });
  };
  
  const handleDeleteWowColumn = (dayKey: string, colIdx: number) => {
    const hasRegs = checkColumnHasRegistrations(dayKey, colIdx);
    setDeleteConfirm({
      open: true,
      dayKey,
      shift: "morning", // Default, but now deletion is global
      colIdx,
      hasRegistrations: hasRegs
    });
  };

  const removeWowColumn = async (dayKey: string, colIdx: number) => {
    const updatedWeek: WeekData = JSON.parse(JSON.stringify(scheduleData));
    const day = updatedWeek[dayKey];
    if (!day) return;

    // Delete from ALL shifts
    const shifts: Array<"morning" | "afternoon" | "evening"> = ["morning", "afternoon", "evening"];
    
    shifts.forEach(sh => {
      const wowsKey = sh === "morning" ? "wows" : sh === "afternoon" ? "wowsAfternoon" : "wowsEvening";
      const branchesKey = sh === "morning" ? "wowBranches" : sh === "afternoon" ? "wowBranchesAfternoon" : "wowBranchesEvening";
      
      if (Array.isArray(day[wowsKey])) day[wowsKey].splice(colIdx, 1);
      if (Array.isArray(day[branchesKey])) day[branchesKey].splice(colIdx, 1);
    });

    if (day.slots) {
      const newSlots: Record<string, SlotData> = {};
      const keys = Object.keys(day.slots);
      
      for (const key of keys) {
        const parts = key.split("_col_");
        if (parts.length === 2 && parts[0] && parts[1]) {
          const time = parts[0] as string;
          const cIdx = parseInt(parts[1], 10);
          
          if (cIdx === colIdx) {
            // Delete this slot globally for that column index
            continue;
          } else if (cIdx > colIdx) {
            // Shift this slot left globally
            const val = day.slots[key];
            if (val) newSlots[`${time}_col_${cIdx - 1}`] = val;
            continue;
          }
        }
        const fallbackVal = day.slots[key];
        if (fallbackVal) newSlots[key] = fallbackVal;
      }
      day.slots = newSlots;
    }
    await saveWeek(weekKey, updatedWeek);
  };

  const getLatestDocument = async () => {
    if (!id) return null;
    try {
      const res = await fetch(`/api/${collectionSlug}/${id}?depth=0`);
      return await res.json();
    } catch (err) {
      console.error("Failed to fetch latest document:", err);
      return null;
    }
  };

  const saveWows = async () => {
    const { dayKey, wowIndex, shift } = wowModal;
    const wowsKey = shift === 'morning' ? 'wows' : shift === 'afternoon' ? 'wowsAfternoon' : 'wowsEvening';

    setIsSavingWow(true);
    try {
      // Concurrency Check for WOW
      const latestDoc = await getLatestDocument();
      const latestWows =
        latestDoc?.schedule_data?.[weekKey]?.[dayKey]?.[wowsKey] || [];
      if (
        wowIndex !== undefined &&
        latestWows[wowIndex] &&
        latestWows[wowIndex] !== (scheduleData[dayKey]?.[wowsKey]?.[wowIndex] || "")
      ) {
        alert(
          `Xung đột WOW!\n\nCột WOW này vừa được người khác thay đổi.\nTrang sẽ tự động tải lại.`,
        );
        window.location.reload();
        return;
      }

      // Fill gaps if any
      const updatedWeek: WeekData = JSON.parse(JSON.stringify(scheduleData));
      const day = updatedWeek[dayKey] as any;
      if (!day) {
        updatedWeek[dayKey] = { date: "", wows: [], slots: {} };
      }
      const targetDay = updatedWeek[dayKey] as any;
      if (!Array.isArray(targetDay[wowsKey])) {
        targetDay[wowsKey] = [];
      }

      for (let i = 0; i <= (wowIndex || 0); i++) {
        if (targetDay[wowsKey][i] === undefined) {
          targetDay[wowsKey][i] = "";
        }
      }
      targetDay[wowsKey][wowIndex!] = selectedWows[0] || "";

      await saveWeek(weekKey, updatedWeek);
      setWowModal({ open: false, dayKey: "" });
    } catch (err) {
      console.error("saveWows err", err);
      alert("Lỗi khi lưu WOW");
    } finally {
      setIsSavingWow(false);
    }
  };

  const toggleWow = (id: string) => {
    if (wowModal.wowIndex !== undefined) {
      // Cho phép bỏ chọn nếu đã chọn chính nó
      setSelectedWows((prev) => (prev.includes(id) ? [] : [id]));
    } else {
      setSelectedWows((prev) =>
        prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
      );
    }
  };

  const getWowName = (id: string): string => {
    const w = wowAdmins.find((a) => a.id === id);
    if (w?.fullName) return w.fullName;
    // Defensive check for id
    if (typeof id !== "string") return "WOW";
    return id.slice(-6);
  };

  const getPerDayCount = useCallback((dayKey: string) => {
    const dData = scheduleData?.[dayKey];
    const wM = dData?.wows || [];
    const wA = dData?.wowsAfternoon || [];
    const wE = dData?.wowsEvening || [];
    return Math.max(wM.length, wA.length, wE.length, 1);
  }, [scheduleData]);

  const gridCols = useMemo(() => {
    const cols: Array<{
      day: (typeof DAYS)[0];
      dayIdx: number;
      idx: number;
      colKey: string;
      wowsCount: number;
    }> = [];
    DAYS.forEach((day, dayIdx) => {
      const dayKey = day?.key;
      const count = getPerDayCount(dayKey);

      for (let i = 0; i < count; i++) {
        cols.push({
          day,
          dayIdx,
          idx: i,
          colKey: `${dayKey}_${i}`,
          wowsCount: count,
        });
      }
    });
    return cols;
  }, [scheduleData, canAssignWow, getPerDayCount]);

  // Danh sách tuần đã có data hợp lệ (ISO date), sắp xếp mới nhất trước
  const sortedWeeks = useMemo(() => {
    return Object.keys(allData)
      .filter(
        (wk) =>
          /^\d{4}-\d{2}-\d{2}$/.test(wk) && !isNaN(new Date(wk).getTime()),
      )
      .sort((a, b) => b.localeCompare(a));
  }, [allData]);

  const jumpToDate = (dateStr: string) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    setCurrentMonday(getMonday(d));
  };

  const jumpToWeekKey = (wk: string) => {
    const d = new Date(wk);
    if (!isNaN(d.getTime())) setCurrentMonday(getMonday(d));
  };

  // Value cho date input (ISO format yyyy-MM-dd)
  const dateInputValue = currentMonday ? toISODate(currentMonday as Date) : "";

  /* === Filter by period === */
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([
    "morning",
    "afternoon",
    "evening",
  ]);

  const filteredSlots = useMemo(() => {
    if (selectedPeriods.length === 0) return []; // Nếu không chọn ca nào thì không hiện gì

    return TIME_SLOTS.filter((slot) => {
      const start = slot.split("-")[0] || "";
      const matches = [];

      if (selectedPeriods.includes("morning")) {
        matches.push(start < "12:30");
      }
      if (selectedPeriods.includes("afternoon")) {
        matches.push(start >= "12:30" && start < "17:30");
      }
      if (selectedPeriods.includes("evening")) {
        matches.push(start >= "17:30");
      }

      return matches.some((m) => m === true);
    });
  }, [selectedPeriods]);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const syncScroll = (source: "top" | "main") => {
    const top = topScrollRef.current;
    const main = mainScrollRef.current;
    if (!top || !main) return;
    if (source === "top") {
      main.scrollLeft = top.scrollLeft;
    } else {
      top.scrollLeft = main.scrollLeft;
    }
  };

  if (!mounted || !currentMonday) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        Đang tải lịch...
      </div>
    );
  }

  /* ============ RENDER ============ */
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ef4444;
          border-radius: 10px;
          transition: background 0.2s;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #dc2626;
        }
        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #ef4444 #f1f5f9;
        }
      `}</style>

      <div className="flex gap-2 p-3 bg-slate-50 border-b border-slate-200 cursor-pointer">
        {[
          {
            key: "morning",
            label: "Ca sáng (09:00 - 12:30)",
            icon: Sunrise,
            active: "bg-amber-400 text-white border-amber-400",
          },
          {
            key: "afternoon",
            label: "Ca chiều (12:30 - 17:30)",
            icon: Sun,
            active: "bg-orange-500 text-white border-orange-500  ",
          },
          {
            key: "evening",
            label: "Ca tối (17:30 - 21:30)",
            icon: Moon,
            active: "bg-indigo-500 text-white border-indigo-500  ",
          },
        ].map((p) => {
          const isActive = selectedPeriods.includes(p.key);
          return (
            <span
              key={p.key}
              onClick={() => {
                setSelectedPeriods((prev) =>
                  isActive ? prev.filter((k) => k !== p.key) : [...prev, p.key],
                );
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all border-2 ${
                isActive ? p.active : `bg-white text-slate-600`
              } cursor-pointer border-2`}
            >
              <p.icon size={16} />
              {p.label}
            </span>
          );
        })}

        {canAssignWow && (
          <span
            onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all border-2 ml-auto ${
              showConfig
                ? "bg-slate-700 text-white border-slate-700"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            } cursor-pointer`}
          >
            <Settings size={16} />
            {showConfig ? "Đóng cấu hình" : "Cấu hình"}
          </span>
        )}
      </div>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 bg-gradient-to-br from-red-500 to-rose-700 gap-3 bg-red-500">
        <div className="flex gap-2">
          <CalendarClock className="text-white" />
          <span className="text-white font-bold">Bảng đăng ký lịch WOW</span>
        </div>

        {/* NAV CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prev / Next */}
          <button
            type="button"
            title="Tuần trước"
            className="w-8 h-8 flex items-center justify-center bg-white border border-white/30 text-black rounded-lg cursor-pointer  transition-colors"
            onClick={() => goWeek(-1)}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Date picker */}
          <input
            type="date"
            value={dateInputValue}
            onChange={(e) => jumpToDate(e.target.value)}
            className="h-8 px-2 rounded-lg text-[12px] font-semibold border border-white/30 bg-white text-black cursor-pointer outline-none focus:ring-2 focus:ring-white/50"
            title="Chọn ngày bất kỳ trong tuần"
          />

          <button
            type="button"
            title="Tuần sau"
            className="w-8 h-8 flex items-center justify-center bg-white border border-white/30 text-black rounded-lg cursor-pointer  transition-colors"
            onClick={() => goWeek(1)}
          >
            <ChevronRight size={16} />
          </button>

          {/* Date picker */}

          {/* Dropdown existing weeks */}
          {sortedWeeks.length > 0 && (
            <select
              className="h-8 px-2 rounded-lg text-[12px] font-semibold border border-white/30 bg-white/90 text-black cursor-pointer outline-none focus:ring-2 focus:ring-white/50 max-w-[180px]"
              value={weekKey}
              onChange={(e) => jumpToWeekKey(e.target.value)}
              title="Chọn tuần đã có data"
            >
              {sortedWeeks.map((wk) => {
                const d = new Date(wk);
                const sun = new Date(d);
                sun.setDate(sun.getDate() + 6);
                return (
                  <option key={wk} value={wk}>
                    {formatDate(d)} – {formatDate(sun)}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      </div>

      {/* PERIOD TABS */}

      {/* TOP SCROLLBAR (Sync with table) */}

      {/* GRID */}
      <div
        ref={mainScrollRef}
        onScroll={() => syncScroll("main")}
        onDragOver={handleContainerDragOver}
        onDragLeave={stopAutoScroll}
        onDrop={stopAutoScroll}
        className="overflow-auto custom-scrollbar pb-2 max-h-[70vh] relative min-h-[400px]"
      >
        {showConfig ? (
          <div className="p-10 bg-white min-h-[400px] flex flex-col items-center justify-start anim-fade-in">
            <div className="w-full max-w-md bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Settings className="text-red-500" size={20} />
                Cấu hình Dashboard Lịch học
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Số tuần học viên có thể xem trước
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={configForm.visibleWeeks || 2}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          visibleWeeks: e.target.value,
                        })
                      }
                      className="flex-1 accent-red-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="w-12 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold text-red-600 shadow-sm">
                      {configForm.visibleWeeks || "–"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Số ngày học sinh phải đặt trước
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="14"
                      step="1"
                      value={configForm.leadTimeDays || 1}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          leadTimeDays: e.target.value,
                        })
                      }
                      className="flex-1 accent-red-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="w-12 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold text-red-600 shadow-sm">
                      {configForm.leadTimeDays || "–"}
                    </span>
                  </div>
                </div>


              </div>

              <div className="mt-10 flex gap-3">
                <button
                  onClick={() => setShowConfig(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer bg-slate-500 text-white"
                >
                  <RotateCcw size={18} />
                  Hủy bỏ
                </button>
                <button
                  onClick={saveConfig}
                  disabled={isSavingConfig}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-0"
                >
                  <Save size={18} />
                  {isSavingConfig ? "Đang lưu..." : "Lưu cấu hình"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-[2px] min-w-[1200px] text-xs rounded-lg">
            <thead>
              {/* Row 1: Day headers */}
              <tr className="text-gray-500 rounded-lg bg-gray-100 sticky top-0 z-[10] shadow-sm">
                <th
                  rowSpan={2}
                  className="w-[100px] min-w-[100px] bg-slate-100 text-black border-r border-slate-300 border-b-2 border-b-red-400 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 top-0 z-[40] shadow-[2px_0_5px_rgba(0,0,0,0.05)] h-[90px]"
                >
                  Giờ
                </th>
                {DAYS.map((day, dayIdx) => {
                  const dayData =
                    (day?.key && (scheduleData as any)?.[day.key]) || {};
                  const span = getPerDayCount(day.key);
                  let dateStr = dayData?.date || "";
                  if (
                    dateStr &&
                    dateStr.includes("-") &&
                    dateStr.split("-").length === 3
                  ) {
                    try {
                      const d = new Date(dateStr);
                      if (!isNaN(d.getTime())) dateStr = formatDate(d);
                    } catch (e) {}
                  }
                  const isOdd = dayIdx % 2 !== 0;
                  const headerBg = isOdd ? "bg-blue-200 text-slate-900" : (dayIdx % 2 === 0 ? "bg-white text-slate-800" : "bg-slate-50 text-slate-800");
                  return (
                    <th
                      key={day.key}
                      colSpan={span}
                      className={`px-2 py-2 text-center border-r border-slate-200 border-b-2 border-b-slate-300 ${headerBg} h-[58px] sticky top-0 z-[10]`}
                    >
                      <div className={`text-[13px] font-bold ${isOdd ? "text-slate-900" : "text-slate-800"}`}>
                        {day.label}
                      </div>
                      <div className={`text-[11px] font-medium ${isOdd ? "text-blue-700/80" : "text-slate-500"}`}>
                        {dateStr}
                      </div>
                      {canManageWowColumns && (
                        <div className="mt-2 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Thêm cột cho tất cả các ca
                              addWowColumn(day.key);
                            }}
                            className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black hover:bg-red-600 transition-all shadow-md flex items-center gap-1.5 border-0 cursor-pointer"
                          >
                            <Plus size={12} strokeWidth={4} />
                            WOW : {span}
                          </button>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>

            </thead>

              {/* WOW Shift Section Mapping */}
            {[
              { shiftPattern: 'morning', label: 'CA SÁNG', slots: filteredSlots.filter(s => (s.split("-")[0] || "") < "12:30"), colors: { main: "bg-amber-400", sticky: "bg-amber-400", border: "border-amber-500" } },
              { shiftPattern: 'afternoon', label: 'CA CHIỀU', slots: filteredSlots.filter(s => { const st = s.split("-")[0] || ""; return st >= "12:30" && st < "17:30"; }), colors: { main: "bg-sky-400", sticky: "bg-sky-400", border: "border-sky-500" } },
              { shiftPattern: 'evening', label: 'CA TỐI', slots: filteredSlots.filter(s => (s.split("-")[0] || "") >= "17:30"), colors: { main: "bg-indigo-500", sticky: "bg-indigo-500", border: "border-indigo-600" } }
            ].filter(sh => sh.slots.length > 0).map((shiftInfo) => {
              const { shiftPattern, label, slots: sSlots, colors } = shiftInfo;
              const shift = shiftPattern as 'morning'|'afternoon'|'evening';
              const wowsKey = shift === 'morning' ? 'wows' : shift === 'afternoon' ? 'wowsAfternoon' : 'wowsEvening';
              const branchesKey = shift === 'morning' ? 'wowBranches' : shift === 'afternoon' ? 'wowBranchesAfternoon' : 'wowBranchesEvening';

              return (
                <tbody key={shift}>
                  {/* WOW sub-headers for this shift */}
                  <tr className="shadow-sm">
                    <th className={`px-2 text-[11px] font-black text-white ${colors.main} border-r ${colors.border} border-b border-b-slate-200 sticky left-0 z-[10]`}>
                       {label}
                    </th>
                    {gridCols.map((col) => {
                      const dayData = (scheduleData as any)[col.day.key] || {};
                      const wowsArray = dayData[wowsKey] || [];
                      const branchesArray = dayData[branchesKey] || [];
                      let wowId = wowsArray[col.idx] !== undefined ? wowsArray[col.idx] : (canAssignWow ? "" : null);
                      if (wowId === "" && !canAssignWow) wowId = null;
                      const branch = branchesArray[col.idx] || "";
                      
                      return (
                        <th
                          key={`subhdr-${shift}-${col.colKey}`}
                          className={`px-1 py-1.5 text-center border-r relative group
                          border-b border-slate-200
                          ${col.dayIdx % 2 === 0 ? "bg-slate-100" : "bg-slate-100"} 
                          ${(wowId !== null || (canAssignWow && col.idx === wowsArray.length)) ? "cursor-pointer transition-colors" : "cursor-default opacity-60"}
                        `}
                        >
                          
                          {wowId !== null ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-2">
                              
                              <div className="relative group">
                                <div
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openWowModal(col.day.key, shift, col.idx);
                                  }}
                                >
                                  {wowId !== "" ? (
                                    <span
                                      className={`text-[12px] px-4 py-1.5 font-bold whitespace-nowrap rounded-lg shadow-sm block bg-red-500 text-white`}
                                    >
                                      {getWowName(wowId)}
                                    </span>
                                  ) : (
                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-red-600 border border-dashed border-red-500 transition-colors">
                                      <span className="text-[20px] font-black h-full flex items-center justify-center">
                                        +
                                      </span>
                                    </div>
                                  )}
                                </div>
    
                                {wowId !== "" && (isAdmin || isWowManager || (isWowExecutive && wowId === user?.id)) && (
                                  <span
                                    title="Xóa WOW này"
                                    className={`absolute -top-2 -right-3.5 w-[18px] h-[18px] flex items-center justify-center rounded-full bg-white text-red-500 transition-all cursor-pointer shadow-sm z-20 border-0`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updatedWeek = JSON.parse(
                                        JSON.stringify(scheduleData),
                                      );
                                      if (updatedWeek[col.day.key]) {
                                        updatedWeek[col.day.key][wowsKey][col.idx] = "";
                                        saveWeek(weekKey, updatedWeek);
                                      }
                                    }}
                                  >
                                    <X size={12} strokeWidth={3} />
                                  </span>
                                )}
                              </div>
    
                              {/* Branch assignment */}
                              {wowId !== "" && (
                                <div className="relative group mt-1">
                                  <div
                                    title={branch ? "Đổi cơ sở" : "Chọn cơ sở"}
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBranchSelection({
                                        open: true,
                                        dayKey: col.day.key,
                                        idx: col.idx,
                                        currentValue: branch || "",
                                        shift: shift
                                      });
                                    }}
                                  >
                                    {branch ? (
                                      <div className="text-[10px] font-bold text-white bg-blue-500 px-3 py-1 rounded-full border border-blue-600 shadow-sm truncate max-w-[110px] hover:bg-blue-600 transition-all">
                                        {branch}
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-dashed border-red-400">
                                        <span className="text-[14px] font-black h-full flex items-center justify-center">
                                          +
                                        </span>
                                      </div>
                                    )}
                                  </div>
    
                                  {canDeleteWow && branch && (
                                    <span
                                      title="Xóa cơ sở"
                                      className="absolute -top-1.5 -right-3 w-[16px] h-[16px] flex items-center justify-center rounded-full bg-white text-red-500 transition-all cursor-pointer shadow-sm z-20 border-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const updatedWeek = JSON.parse(
                                          JSON.stringify(scheduleData),
                                        );
                                        const day = updatedWeek[col.day.key];
                                        if (day && day[branchesKey]) {
                                          day[branchesKey][col.idx] = "";
                                          saveWeek(weekKey, updatedWeek);
                                        }
                                      }}
                                    >
                                      <X size={12} strokeWidth={3} />
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center relative">
                             {/* Always show WOW column UI if wowId is "" */}
                            </div>
                          )}

                          {/* Nút xóa cột WOW tại ô chỉ định (ô +) */}
                          {canManageWowColumns && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWowColumn(col.day.key, col.idx);
                              }}
                              className="absolute top-1 right-1 text-red-500 hover:text-red-700 transition-all cursor-pointer border-0 bg-transparent p-0.5 z-30 opacity-0 group-hover:opacity-100"
                              title="Xóa cột WOW này"
                            >
                              <X size={14} strokeWidth={4} />
                            </button>
                          )}

                          {/* Remove close button for fixed columns */}
                        </th>
                      );
                    })}
                  </tr>

                  {sSlots.map((slot) => {
                    const startHourStr = slot.split("-")[0] || "00:00";
    
                    let rowBg = "bg-white";
                    if (startHourStr < "12:30") rowBg = "bg-orange-50/40";
                    else if (startHourStr < "17:30") rowBg = "bg-sky-50/40";
                    else rowBg = "bg-indigo-50/40";
    
                    return (
                      <tr key={`row-${slot}`} className={rowBg}>
                        <td
                          className={`px-2 text-center text-[11px] font-semibold text-slate-600 border-r border-slate-300 border-b border-slate-200 sticky left-0 z-[1] min-h-[52px] h-[52px] whitespace-nowrap leading-tight bg-white shadow-[1px_0_0_rgba(0,0,0,0.1)]`}
                        >
                          {slot.replace("-", " – ")}
                        </td>
                        {gridCols.map((col) => {
                          const stableSlotKey = `${slot.split("-")[0] || ""}_col_${col.idx}`;
                          const dayData = (scheduleData as any)[col.day.key] || {};
                          const wowsArray = dayData[wowsKey] || [];
                          const shiftWowId = wowsArray[col.idx] !== undefined ? wowsArray[col.idx] : (canAssignWow ? "" : null);
                          const idSlotKey = shiftWowId ? `${slot}_${shiftWowId}` : null;
                          const unassignedSlotKey = `${slot}_unassigned_${col.idx}`;
                          const legacySlotKey = col.idx === 0 ? slot : null;
    
                          let slotData =
                            scheduleData[col.day.key]?.slots?.[stableSlotKey];
    
                          if (!slotData) {
                            const fb = [
                              idSlotKey,
                              unassignedSlotKey,
                              legacySlotKey,
                            ].find(
                              (k) => k && scheduleData[col.day.key]?.slots?.[k],
                            );
                            if (fb)
                              slotData = scheduleData[col.day.key]?.slots?.[fb];
                          }
                          const isDragSource =
                            draggedSlot?.dayKey === col.day.key &&
                            draggedSlot?.slotKey === stableSlotKey;
                          const isDragOver =
                            dragOverTarget?.dayKey === col.day.key &&
                            dragOverTarget?.slotKey === stableSlotKey;
    
                          const branchesArray = dayData[branchesKey] || [];
                          const branch = branchesArray[col.idx] || "";
    
                          return (
                            <GridCell
                              key={`${slot}_${col.colKey}`}
                              dayKey={col.day.key}
                              slotKey={stableSlotKey}
                              wowId={shiftWowId} 
                              wowIdx={col.idx}
                              slotData={slotData}
                              canManageSlots={canManageSlots}
                              onOpenResult={openResult}
                              onOpenRegister={openRegister}
                              onRemoveSlot={removeSlot}
                              onDragStart={(slot) => {
                                setTimeout(() => setDraggedSlot(slot), 0);
                              }}
                              onDragOver={(dayKey, sKey) => {
                                if (
                                  dragOverTarget?.dayKey !== dayKey ||
                                  dragOverTarget?.slotKey !== sKey
                                ) {
                                  setDragOverTarget({ dayKey, slotKey: sKey });
                                }
                              }}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(dayKey, sKey) => {
                                if (draggedSlot) {
                                  handleMoveSlot(draggedSlot, dayKey, sKey);
                                }
                              }}
                              isDragSource={isDragSource}
                              isDragOver={isDragOver}
                              columnBg={col.day.columnBg}
                              branchName={branch}
                            />
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}

          </table>
        )}
      </div>

      {modal.open && (
        <RegistrationModal
          open={modal.open}
          dayKey={modal.dayKey}
          slotKey={modal.slotKey}
          onClose={() => !isSaving && setModal({ ...modal, open: false })}
          onSave={saveRegister}
          user={user}
          form={form}
          readOnly={!isAdmin && !isWowManager && !isWowExecutive && !isFullTimeTeacher && !isPartTimeTeacher}
          isLoading={isSaving}
        />
      )}

      <WowAssignmentModal
        open={wowModal.open}
        dayKey={wowModal.dayKey}
        wowIndex={wowModal.wowIndex}
        wowAdmins={wowAdmins}
        selectedWows={selectedWows}
        onToggleWow={toggleWow}
        onClose={() => setWowModal({ open: false, dayKey: "" })}
        onSave={saveWows}
        isLoading={isSavingWow}
      />

      {/* Modal chọn Cơ sở - Beautiful UI */}
      {branchSelection.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() =>
              setBranchSelection((prev) => ({ ...prev, open: false }))
            }
          />
          <div className="relative bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-sm overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  CƠ SỞ LÀM VIỆC
                </h3>
              </div>
              <button
                onClick={() =>
                  setBranchSelection((prev) => ({ ...prev, open: false }))
                }
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-md border-0 cursor-pointer"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-4 bg-slate-50/50">
              <div className="grid grid-cols-1 gap-2.5">
                {branches.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                      <Save size={24} />
                    </div>
                    <p className="text-slate-400 text-[13px] font-medium">
                      Chưa có dữ liệu cơ sở
                    </p>
                  </div>
                ) : (
                  branches.map((b: any) => (
                    <button
                      key={b.id}
                      className={`group flex items-center gap-3 w-full p-3.5 rounded-xl text-left transition-all border-0 cursor-pointer ${
                        branchSelection.currentValue === b.name
                          ? "bg-red-700 text-white shadow-lg scale-[1.01]"
                          : "bg-red-500 text-white hover:bg-red-600 shadow-sm"
                      }`}
                      onClick={() => {
                        const updatedWeek: WeekData = JSON.parse(
                          JSON.stringify(scheduleData),
                        );
                        const dayData = updatedWeek[branchSelection.dayKey];
                        if (dayData) {
                          const bKey = (branchSelection.shift === 'morning'
                            ? 'wowBranches'
                            : branchSelection.shift === 'afternoon'
                              ? 'wowBranchesAfternoon'
                              : 'wowBranchesEvening') as
                            | "wowBranches"
                            | "wowBranchesAfternoon"
                            | "wowBranchesEvening";

                          if (!dayData[bKey]) {
                            (dayData as any)[bKey] = [];
                          }
                          const branchArray = dayData[bKey] as string[];
                          branchArray[branchSelection.idx] = b.name;

                          saveWeek(weekKey, updatedWeek);
                          setBranchSelection({ ...branchSelection, open: false });
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <div className="font-black text-[14px] truncate text-white">
                          {b.name}
                        </div>
                        {b.address && (
                          <div className={`text-[11px] font-bold truncate ${branchSelection.currentValue === b.name ? "text-red-100" : "text-red-50"}`}>
                            - {b.address}
                          </div>
                        )}
                      </div>
                      {branchSelection.currentValue === b.name && (
                        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-red-700">
                          <Save size={12} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>



          </div>
        </div>
      )}

      <ResultModal
        open={resultModal.open}
        onClose={() => setResultModal({ ...resultModal, open: false })}
        onSave={saveResult}
        form={resultForm}
        dayLabel={DAYS.find((d) => d.key === resultModal.dayKey)?.label || ""}
        studentName={
          scheduleData[resultModal.dayKey]?.slots?.[resultModal.slotKey]
            ?.studentName || ""
        }
      />

      {/* Modal xác nhận xóa cột WOW */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm({ ...deleteConfirm, open: false })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4 text-red-600">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <X size={24} strokeWidth={3} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Xác nhận xóa cột WOW</h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-slate-600 font-medium text-[13px]">
                  Bạn đang yêu cầu xóa <span className="font-bold text-slate-900">cột WOW thứ {deleteConfirm.colIdx + 1}</span> của <span className="font-bold text-slate-900">tất cả các ca (Sáng, Chiều, Tối)</span> trong ngày này.
                </p>
                
                {deleteConfirm.hasRegistrations && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                    <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                       ⚠️ CẢNH BÁO CỰC KỲ QUAN TRỌNG:
                    </p>
                    <p className="text-red-600 text-[13px] mt-1 font-medium leading-relaxed">
                      Cột này <span className="underline decoration-2">đang có học viên đăng ký</span> ở một hoặc nhiều ca. Nếu bạn xóa, toàn bộ thông tin đăng ký trong cột này (của tất cả các ca) sẽ bị <span className="font-black">MẤT HOÀN TOÀN</span> và các cột phía sau sẽ bị đẩy lên.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setDeleteConfirm({ ...deleteConfirm, open: false })}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all border-0 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => {
                      removeWowColumn(deleteConfirm.dayKey, deleteConfirm.colIdx);
                      setDeleteConfirm({ ...deleteConfirm, open: false });
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg hover:shadow-red-500/20 border-0 cursor-pointer"
                  >
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa lịch đăng ký */}
      {regDeleteConfirm.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() =>
              setRegDeleteConfirm((prev) => ({ ...prev, open: false }))
            }
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">
                Xác nhận xóa đăng ký
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed text-[15px]">
                Bạn có chắc chắn muốn xóa lịch đăng ký của học viên{" "}
                <span className="font-bold text-red-600">
                  {regDeleteConfirm.studentName}
                </span>{" "}
                (Lớp: <span className="font-bold text-slate-800">{regDeleteConfirm.className}</span>) không?
                <br />
                <span className="text-[11px] text-slate-400 mt-3 block italic">
                  * Hành động này sẽ xóa hoàn toàn lịch hẹn và không thể hoàn tác.
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setRegDeleteConfirm((prev) => ({ ...prev, open: false }))
                  }
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all border-0 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() =>
                    confirmRemoveSlot(
                      regDeleteConfirm.dayKey,
                      regDeleteConfirm.slotKey,
                    )
                  }
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg border-0 cursor-pointer"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
