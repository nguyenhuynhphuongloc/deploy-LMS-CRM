/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/(app)/_providers/Auth";
import PageLoading from "@/components/PageLoading";
import { StudentWowGrid } from "@/app/(app)/(authenticated)/student/booking-wow/components/StudentWowGrid";
import { ScheduleData, WeekData, WowAdmin } from "@/components/ScheduleView/parts/types";
import { ROLES } from "@/payload/access";
import { useRealtime } from "@/hooks/useRealtime";
import Link from "next/link";
import { Home, AlertCircle } from "lucide-react";

export default function StudentBookingGridPage() {
  const { user } = useAuth();
  const [scheduleDoc, setScheduleDoc] = useState<any>(null);
  const [wowAdmins, setWowAdmins] = useState<WowAdmin[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [className, setClassName] = useState<string>("");
  const [profileName, setProfileName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const lastDataRef = React.useRef<string>(""); // Lưu JSON của dữ liệu cũ để so sánh

  const fetchData = React.useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);

    
      const wowQuery = {
        where: {
          role: {
            in: [ROLES.WOW_EXECUTIVE, ROLES.WOW_MANAGER],
          },
        },
        depth: 0,
        limit: 1000,
      };
      
      const wowRes = await fetch(`/api/admins?${new URLSearchParams({
        where: JSON.stringify(wowQuery.where),
        depth: "0",
        limit: "1000"
      }).toString()}`);
      const wowData = await wowRes.json();
      
      // Deduplicate wowAdmins by ID
      const rawAdmins = wowData.docs || [];
      const uniqueAdmins: WowAdmin[] = [];
      const adminIds = new Set();
      rawAdmins.forEach((admin: any) => {
        if (admin.id && !adminIds.has(admin.id)) {
          adminIds.add(admin.id);
          uniqueAdmins.push(admin);
        }
      });
      setWowAdmins(uniqueAdmins);

      // 2. Fetch the master schedule document with CACHE BUSTING (Removed limit: workaround for server query error)
      const fetchUrl = `/api/booking_schedule?sort=-createdAt&depth=0&t=${Date.now()}&_rt=${Math.random()}`;
      const scheduleRes = await fetch(fetchUrl, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      const scheduleDataRes = await scheduleRes.json();
      
      // 3. Fetch Student's Class Name & Full Profile
      if (user?.id) {
        // Fetch class
        const classRes = await fetch(`/api/classes?where[students][in]=${user.id}`);
        const classData = await classRes.json();
        if (classData.docs?.[0]) {
          setClassName(classData.docs[0].name);
        }
        const userId = user.id;
        const userRes = await fetch(`/api/users/${userId}?depth=1`);
        if (userRes.ok) {
          const userData = await userRes.json();
          const fullName = userData.lead?.fullName || userData.fullName || userData.username || userData.email;
          if (fullName) {
            setProfileName(fullName);
          }
        }
      }

      // 4. Fetch Branches for address lookup
      const branchRes = await fetch("/api/branches?depth=0&limit=100");
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(branchData.docs || []);
      }

      // Return the change status for real-time retry logic
      if (scheduleDataRes.docs && scheduleDataRes.docs.length > 0) {
         const newDoc = scheduleDataRes.docs[0];
         const newDocStr = JSON.stringify(newDoc.schedule_data || {});
         
         if (lastDataRef.current !== newDocStr) {
            lastDataRef.current = newDocStr;
            setScheduleDoc(newDoc);
            return true;
         }
      } else {
         console.warn("⚠️ [Student] Không tìm thấy booking_schedule nào từ API.");
      }
      return false;
    } catch (error) {
      console.error("Error fetching student booking data:", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [user?.id]);

  const currentStudentId = user?.id || "";
  const currentStudentName = profileName || (user as any)?.lead?.fullName || (user as any)?.fullName || user?.email || "Học viên";

  // Use SSE for real-time updates instead of polling
  useRealtime(async (data) => {
    if (document.visibilityState === "visible") {
      // Chạy fetchData - kết quả trả về true nếu dữ liệu thực sự là mới
      const isActuallyNew = await fetchData(true);
      
      // Nếu dữ liệu nhận được vẫn là cũ so với tín hiệu (Race condition), thử lại lần nữa sau 700ms và 2000ms
      if (!isActuallyNew) {
        setTimeout(async () => {
          const secondTry = await fetchData(true);
          if (!secondTry) {
            setTimeout(() => {
               void fetchData(true);
            }, 2000);
          }
        }, 800);
      }
    }
  });

  useEffect(() => {
    void fetchData();

    // Lắng nghe sự kiện người dùng chuyển lại tab (hoặc mở lại browser window)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Fallback: lắng nghe sự kiện focus cửa sổ
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [fetchData]);

  const handleSaveSchedule = async (weekKey: string, weekData: WeekData) => {
    if (!scheduleDoc) return;

    try {
      // 1. Concurrency Check: Fetch latest state before saving
      const checkRes = await fetch(`/api/booking_schedule/${scheduleDoc.id}?depth=0`);
      if (checkRes.ok) {
        const latestDoc = await checkRes.json();
        // If someone else already registered in the meantime, alert and refresh data
        // For simplicity, we compare the entire week's schedule_data
        // but specifically we should look at the change. 
        // Component passes the whole weekData, so we check if the server's weekData has changed.
        const serverWeekData = latestDoc.schedule_data?.[weekKey];
        const localWeekDataAtStart = scheduleDoc.schedule_data?.[weekKey];
        
        if (JSON.stringify(serverWeekData) !== JSON.stringify(localWeekDataAtStart)) {
           setShowConflictModal(true);
           setScheduleDoc(latestDoc);
           lastDataRef.current = JSON.stringify(latestDoc.schedule_data);
           return; 
        }
      }

      const updatedScheduleData: ScheduleData = {
        ...(scheduleDoc.schedule_data || {}),
        [weekKey]: weekData,
      };

      const res = await fetch(`/api/booking_schedule/${scheduleDoc.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedule_data: updatedScheduleData,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save schedule");
      }

      const updatedDoc = await res.json();
      setScheduleDoc(updatedDoc.doc);
      lastDataRef.current = JSON.stringify(updatedDoc.doc.schedule_data || {});
      
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert("Đã có lỗi xảy ra khi lưu đăng ký. Vui lòng thử lại.");
    }
  };

  if (loading || !user) {
    return <PageLoading />;
  }

  if (!scheduleDoc) {
    return (
      <div className="p-8 text-center text-slate-500">
        Không tìm thấy dữ liệu lịch học. Vui lòng liên hệ Admin.
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden px-4 bg-slate-50">
      {/* HEADER QUAY VỀ */}
      <div className="flex items-center justify-between py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link 
            href="/student" 
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-bold text-sm shadow-sm"
          >
            <Home size={16}/>
            Trang chủ
          </Link>
          <div className="h-4 w-[1px] bg-slate-300" />
          <h1 className="text-lg font-bold text-red-600 uppercase tracking-tight">Đăng ký lịch học WOW</h1>
        </div>
        <p className="text-slate-500 text-xs font-semibold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
          Lớp: {className || "..."}
        </p>
      </div>

      <div className="flex-1 overflow-hidden pt-4">
        <StudentWowGrid
          initialData={scheduleDoc.schedule_data || {}}
          wowAdmins={wowAdmins}
          currentStudentId={user.id}
          currentStudentName={currentStudentName}
          currentClassName={className}
          wowQuota={(user as any)?.lead?.wow_quota ?? 1}
          visibleWeeks={scheduleDoc.wow_manager_config?.visibleWeeks ?? 2}
          leadTimeDays={scheduleDoc.wow_manager_config?.leadTimeDays ?? 1}
          deleteLeadTimeDays={scheduleDoc.wow_manager_config?.deleteLeadTimeDays ?? 2}
          maxSlotsPerCell={scheduleDoc.wow_manager_config?.maxSlotsPerCell ?? 3}
          onSave={handleSaveSchedule}
          branches={branches}
        />
      </div>

      {/* Conflict Modal */}
      {showConflictModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Khung giờ đã được đăng ký
              </h3>
              <p className="text-slate-600">
                Xin lỗi, đã có học viên đăng ký khung giờ này trước bạn. Hệ thống đã tải lại dữ liệu mới nhất.
              </p>
              <button
                onClick={() => setShowConflictModal(false)}
                className="mt-6 w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

