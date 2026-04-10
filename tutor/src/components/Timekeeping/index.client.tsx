"use client";

import React, { useMemo, useState } from "react";
import { usePayloadAPI } from "@payloadcms/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  format, 
  parseISO, 
  isValid, 
  addMinutes, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval,
  parse
} from "date-fns";
import { vi } from "date-fns/locale";
import { Loader2, Calendar, User, FileText, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { ROLES } from "@/payload/access";

const TimekeepingClient: React.FC = () => {
  // --- State for Filters ---
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");

  // --- Fetch Data ---
  const [{ data: classesData, isLoading: classesLoading }] = usePayloadAPI(
    "/api/classes?limit=1000&depth=2",
  );

  const [{ data: attendanceData, isLoading: attendanceLoading }] = usePayloadAPI(
    "/api/attendanceRecords?limit=1000",
  );

  const [{ data: adminsData, isLoading: adminsLoading }] = usePayloadAPI(
    `/api/admins?limit=1000&where[role][in]=${ROLES.TEACHER_FULL_TIME},${ROLES.TEACHER_PART_TIME}`,
  );

  const isLoading = classesLoading || attendanceLoading || adminsLoading;

  // --- Derived Data ---
  const teachers = useMemo(() => {
    return (adminsData?.docs || []).sort((a: any, b: any) => 
      (a.fullName || a.username).localeCompare(b.fullName || b.username)
    );
  }, [adminsData]);

  const payrollData = useMemo(() => {
    if (!classesData || !attendanceData || !startDate || !endDate) return [];

    const studentsAttendance = attendanceData.docs || [];
    const classes = classesData.docs || [];
    
    const start = parse(startDate, "yyyy-MM-dd", new Date());
    const end = parse(endDate, "yyyy-MM-dd", new Date());
    end.setHours(23, 59, 59, 999);

    const teacherMap: Record<string, any> = {};

    classes.forEach((cls: any) => {
      const sessions = cls.sessions || [];
      const timePerSession = cls.time_per_session || 0;
      const typeClass = cls.type_class;

      sessions.forEach((session: any) => {
        if (!session.date || !session.teacher) return;

        const sessionDate = parseISO(session.date);
        if (!isValid(sessionDate)) return;

        // Filter by Date Range
        const isInRange = isWithinInterval(sessionDate, { start, end });
        if (!isInRange) return;

        const teacher = session.teacher;
        const teacherId = typeof teacher === "object" ? teacher.id : teacher;
        const teacherName = typeof teacher === "object" ? teacher.fullName || teacher.username : "Giáo viên";

        // Filter by Teacher
        if (selectedTeacherId !== "all" && teacherId !== selectedTeacherId) return;

        if (!teacherMap[teacherId]) {
          teacherMap[teacherId] = {
            id: teacherId,
            name: teacherName,
            totalMinutes: 0,
            sessionsCount: 0,
            details: [],
          };
        }

        // Check attendance status
        const classAttendance = studentsAttendance.find((a: any) => (typeof a.class === 'object' ? a.class.id === cls.id : a.class === cls.id));
        const isAttended = classAttendance ? !!(classAttendance.AttendanceRecord_data?.[session.id]) : false;

        const durationHours = typeClass === "one_to_one" ? (session.duration || 0) : timePerSession;
        const durationMinutes = Math.round(durationHours * 60);

        const endTime = addMinutes(sessionDate, durationMinutes);

        teacherMap[teacherId].sessionsCount += 1;
        teacherMap[teacherId].totalMinutes += durationMinutes;
        teacherMap[teacherId].details.push({
          id: session.id,
          sessionName: `Buổi học ${cls.sessions.indexOf(session) + 1}`,
          className: cls.name,
          dayOfWeek: format(sessionDate, "EEEE", { locale: vi }),
          dateFormatted: format(sessionDate, "dd/MM/yyyy"),
          timeRange: `${format(sessionDate, "HH:mm")} - ${format(endTime, "HH:mm")}`,
          status: isAttended ? "Có" : "Không",
          duration: durationMinutes,
        });
      });
    });

    return Object.values(teacherMap).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [classesData, attendanceData, startDate, endDate, selectedTeacherId]);

  // --- Helpers ---
  const formatDurationString = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${totalMinutes} phút - (${hours} giờ - ${minutes} phút)`;
  };

  // --- Export Excel ---
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Flatten data for Excel
    const excelData: any[] = [];
    
    // Header Info
    excelData.push(["BÁO CÁO CHẤM CÔNG GIÁO VIÊN"]);
    excelData.push([`Từ ngày: ${format(parse(startDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")} - Đến ngày: ${format(parse(endDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")}`]);
    excelData.push([]);
    
    // Column Headers
    excelData.push([
      "STT", 
      "Giáo viên/Buổi học", 
      "Lớp học", 
      "Thứ", 
      "Ngày", 
      "Giờ học", 
      "Điểm danh", 
      "Thời lượng (phút)",
      "Tổng kết thời gian"
    ]);

    let stt = 1;
    payrollData.forEach((teacher: any) => {
      // Teacher Row
      excelData.push([
        stt++,
        teacher.name.toUpperCase(),
        "",
        "",
        "",
        "",
        "",
        "",
        formatDurationString(teacher.totalMinutes)
      ]);

      // Session Rows
      teacher.details.forEach((session: any) => {
        excelData.push([
          "",
          session.sessionName,
          session.className,
          session.dayOfWeek,
          session.dateFormatted,
          session.timeRange,
          session.status,
          session.duration,
          ""
        ]);
      });
      
      excelData.push([]); // Spacer
    });

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "ChamCong");
    
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    
    saveAs(data, `Chấm_Công_Giáo_Viên_${startDate}_đến_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6 mb-20">
      {/* Filters Header */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {/* Teacher Select */}
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest">
              <User className="h-3 w-3" /> Giáo viên
            </label>
            <select 
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-red-500 focus:border-red-500 block w-full p-2.5 font-bold outline-none h-11 cursor-pointer"
            >
              <option value="all">Tất cả giáo viên</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.fullName || t.username}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest">
              <Calendar className="h-3 w-3" /> Từ ngày
            </label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-200 border-none border-gray-200 text-black text-sm rounded-xl focus:ring-red-500 focus:border-red-500 block w-full p-2 font-bold outline-none h-11 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest">
              <Calendar className="h-3 w-3" /> Đến ngày
            </label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-200 border-none border-gray-200 text-black text-sm rounded-xl focus:border-red-500 block w-full p-2 font-bold outline-none h-11 cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 ml-auto">
             <label className="text-[10px] font-black text-transparent select-none">Action</label>
             <button
                onClick={handleExportExcel}
                disabled={isLoading || payrollData.length === 0}
                className="flex items-center gap-2 px-6 h-11 bg-emerald-600 border-none cursor-pointer hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-black text-sm transition-all shadow-md active:scale-95"
             >
                <Download className="h-4 w-4" />
                XUẤT FILE EXCEL
             </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-red-600 pt-2 border-t border-gray-50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Đang cập nhật dữ liệu báo cáo...</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-red-600" />
        </div>
      ) : (
        <div className="rounded-[20px] border border-gray-200 bg-white overflow-hidden shadow-sm">
          <Table className="border-collapse">
            <TableHeader className="bg-white">
              <TableRow className="border-b border-gray-200 group hover:bg-transparent">
                <TableHead className="w-[50px] text-center border-r border-gray-400 font-bold text-gray-800 bg-gray-100">#</TableHead>
                <TableHead className="px-4 font-bold text-gray-800 bg-gray-100 border-r border-gray-400">Buổi học</TableHead>
                <TableHead className="px-4 font-bold text-gray-800 bg-gray-100 border-r border-gray-400">Lớp học</TableHead>
                <TableHead className="px-4 font-bold text-gray-800 bg-gray-100 border-r border-gray-400">Thứ</TableHead>
                <TableHead className="px-4 font-bold text-gray-800 bg-gray-100 border-r border-gray-400">Ngày</TableHead>
                <TableHead className="px-4 font-bold text-gray-800 bg-gray-100 border-r border-gray-400">Giờ học</TableHead>
                <TableHead className="px-4 font-bold text-gray-800 text-center bg-gray-100 border-r border-gray-400">Điểm danh</TableHead>
                <TableHead className="px-4 font-bold text-gray-800 text-right bg-gray-100">Tổng giờ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-20 text-center text-gray-500 font-medium whitespace-nowrap">
                    <div className="flex flex-col items-center gap-2">
                       <FileText className="h-8 w-8 text-gray-300" />
                       <span className="font-bold text-gray-500 uppercase tracking-widest text-xs">Không tìm thấy dữ liệu cho khoảng thời gian này</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                payrollData.map((teacher: any, tIdx: number) => (
                  <React.Fragment key={teacher.id}>
                    {/* Teacher Summary Header Row */}
                    <TableRow className="bg-red-500 hover:bg-red-600 transition-colors border-b text-white border-red-400">
                      <TableCell className="text-center font-bold text-white border-r border-red-400/50 py-2">
                        {tIdx + 1}
                      </TableCell>
                      <TableCell colSpan={6} className="font-bold text-white py-2 px-4 uppercase tracking-tight text-xs border-r border-red-400/50">
                        {teacher.name}
                      </TableCell>
                      <TableCell className="text-right font-bold text-white py-2 px-4 text-xs whitespace-nowrap">
                        {formatDurationString(teacher.totalMinutes)}
                      </TableCell>
                    </TableRow>

                    {/* Sessions details */}
                    {teacher.details.map((session: any, sIdx: number) => (
                      <TableRow 
                        key={`${teacher.id}-${sIdx}`} 
                        className={`border-b border-gray-500 hover:bg-gray-100 transition-colors text-[11px] ${sIdx % 2 !== 0 ? 'bg-gray-50/80' : 'bg-white'}`}
                      >
                        <TableCell className="border-r border-gray-500 text-center text-gray-600 py-3 italic"></TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-500">
                           <span className="font-bold text-gray-800">{session.sessionName}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-400">
                           <span className="text-[10px] text-gray-700 font-bold uppercase truncate max-w-[300px]">{session.className}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap border-r border-gray-400">{session.dayOfWeek}</TableCell>
                        <TableCell className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap border-r border-gray-400">{session.dateFormatted}</TableCell>
                        <TableCell className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap border-r border-gray-400">{session.timeRange}</TableCell>
                        <TableCell className="px-4 py-3 text-center border-r border-gray-400">
                           <span className={`font-bold ${session.status === 'Có' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {session.status}
                           </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-bold text-gray-800 whitespace-nowrap">
                           {session.duration} phút ({Math.floor(session.duration/60)} giờ - {session.duration%60} phút)
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default TimekeepingClient;
