"use client";

import { usePayloadAPI } from "@payloadcms/ui";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiChevronLeft,
  FiChevronRight,
  FiSave,
  FiSearch,
  FiSettings,
  FiX,
} from "react-icons/fi";
import {
  VIOLATION_LABELS,
  VIOLATION_RULES,
  ViolationType,
} from "../../payload/constants/violationRules";

/* ================= VIOLATIONS ================= */
const VIOLATIONS = Object.entries(VIOLATION_LABELS).map(([key, label]) => ({
  key: key as ViolationType,
  label,
}));

const STATUS_MAP: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  none: { label: "Tuân thủ tốt", color: "text-white", bgColor: "bg-green-600" },
  warning_1: {
    label: "Cảnh báo lần 1",
    color: "text-white",
    bgColor: "bg-red-600",
  },
  warning_2: {
    label: "Cảnh báo lần 2",
    color: "text-white",
    bgColor: "bg-red-600",
  },
  terminated: {
    label: "Đã hủy cam kết",
    color: "text-white",
    bgColor: "bg-red-600",
  },
};

type ViolationSummaryRow = {
  className: string;
  studentName: string;
  totalViolations: number;
  details: Record<ViolationType, number>;
  studentId?: string;
  violationStatus?: string;
  studentEmail?: string;
  computedStatus?: string;
};

export default function AllClassesViolationSummaryUI() {
  const [search, setSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [thresholds, setThresholds] = useState<Record<string, number>>({
    no_camera_threshold: VIOLATION_RULES.no_camera,
    no_camera_warning_2: 6,
    no_camera_terminated: 8,
    absent_without_permission_threshold:
      VIOLATION_RULES.absent_without_permission,
    absent_without_permission_warning_2: 5,
    absent_without_permission_terminated: 7,
    late_homework_threshold: VIOLATION_RULES.late_homework,
    late_homework_warning_2: 8,
    late_homework_terminated: 10,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [{ data, isLoading }] = usePayloadAPI("/api/attendanceRecords", {
    initialParams: {
      limit: 200,
      depth: 12,
      locale: "vi",
    },
  });

  const [{ data: settingsData }] = usePayloadAPI(
    "/api/globals/violation-rules",
  );

  useEffect(() => {
    if (settingsData) {
      setThresholds({
        no_camera_threshold:
          settingsData.no_camera_threshold || VIOLATION_RULES.no_camera,
        no_camera_warning_2: settingsData.no_camera_warning_2 || 6,
        no_camera_terminated: settingsData.no_camera_terminated || 8,
        absent_without_permission_threshold:
          settingsData.absent_without_permission_threshold ||
          VIOLATION_RULES.absent_without_permission,
        absent_without_permission_warning_2:
          settingsData.absent_without_permission_warning_2 || 5,
        absent_without_permission_terminated:
          settingsData.absent_without_permission_terminated || 7,
        late_homework_threshold:
          settingsData.late_homework_threshold || VIOLATION_RULES.late_homework,
        late_homework_warning_2: settingsData.late_homework_warning_2 || 8,
        late_homework_terminated: settingsData.late_homework_terminated || 10,
      });
    }
  }, [settingsData]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/globals/violation-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          no_camera_threshold: thresholds.no_camera_threshold,
          no_camera_warning_2: thresholds.no_camera_warning_2,
          no_camera_terminated: thresholds.no_camera_terminated,
          absent_without_permission_threshold:
            thresholds.absent_without_permission_threshold,
          absent_without_permission_warning_2:
            thresholds.absent_without_permission_warning_2,
          absent_without_permission_terminated:
            thresholds.absent_without_permission_terminated,
          late_homework_threshold: thresholds.late_homework_threshold,
          late_homework_warning_2: thresholds.late_homework_warning_2,
          late_homework_terminated: thresholds.late_homework_terminated,
        }),
      });
      if (res.ok) {
        setIsSettingsOpen(false);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  const attendanceRecords = data?.docs ?? [];

  // Reset selection when data refreshes
  useMemo(() => {
    setSelectedStudents([]);
  }, [data]);

  const allViolationsSummary = useMemo(() => {
    const summary: ViolationSummaryRow[] = [];
    attendanceRecords.forEach((record: any) => {
      const className = record.class?.name ?? "Lớp chưa đặt tên";
      const students = record.class?.students ?? [];
      const violationData = record.ViolationRecord_data ?? {};

      students.forEach((student: any) => {
        const studentId = student.id;
        const studentName =
          student?.lead?.fullName ||
          student?.fullName ||
          `Học viên (${studentId?.slice(0, 6)})`;

        const row: ViolationSummaryRow = {
          className,
          studentName,
          totalViolations: 0,
          details: Object.fromEntries(
            VIOLATIONS.map((v) => [v.key, 0]),
          ) as Record<ViolationType, number>,
          studentId,
          violationStatus: student.violationStatus,
          studentEmail: student.email,
        };

        Object.values(violationData).forEach((session: any) => {
          const studentViolations = session?.students?.[studentId];
          if (!studentViolations) return;
          VIOLATIONS.forEach((v) => {
            if (studentViolations[v.key]) {
              row.totalViolations++;
              row.details[v.key]++;
            }
          });
        });

        // Compute the status dynamically based on current counts and thresholds
        let computedStatus = "none";
        const checkAndSetSeverity = (count: number, vKey: ViolationType) => {
          const termThreshold =
            thresholds[`${vKey}_terminated`] || VIOLATION_RULES[vKey];
          const warn2Threshold =
            thresholds[`${vKey}_warning_2`] || VIOLATION_RULES[vKey];
          const warn1Threshold =
            thresholds[`${vKey}_threshold`] || VIOLATION_RULES[vKey];

          if (count >= termThreshold) {
            computedStatus = "terminated";
          } else if (
            count >= warn2Threshold &&
            computedStatus !== "terminated"
          ) {
            computedStatus = "warning_2";
          } else if (
            count >= warn1Threshold &&
            computedStatus !== "terminated" &&
            computedStatus !== "warning_2"
          ) {
            computedStatus = "warning_1";
          }
        };

        VIOLATIONS.forEach((v) => {
          checkAndSetSeverity(row.details[v.key] || 0, v.key);
        });

        row.computedStatus = computedStatus;

        summary.push(row);
      });
    });
    return summary;
  }, [attendanceRecords, thresholds]);

  const filteredSummary = useMemo(() => {
    const q = search.toLowerCase();
    let filtered = allViolationsSummary.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q),
    );

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.computedStatus === statusFilter);
    }

    // Sort by status: terminated > warning_2 > warning_1 > none
    const STATUS_WEIGHT: Record<string, number> = {
      terminated: 4,
      warning_2: 3,
      warning_1: 2,
      none: 1,
    };

    filtered.sort((a, b) => {
      const weightA = STATUS_WEIGHT[a.computedStatus || "none"] || 0;
      const weightB = STATUS_WEIGHT[b.computedStatus || "none"] || 0;
      return weightB - weightA;
    });

    return filtered;
  }, [search, statusFilter, allViolationsSummary]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filteredSummary.length / itemsPerPage);
  const paginatedSummary = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSummary.slice(start, start + itemsPerPage);
  }, [filteredSummary, currentPage]);

  const validStudentIds = useMemo(() => {
    return filteredSummary
      .map((r) => r.studentId)
      .filter((id): id is string => !!id);
  }, [filteredSummary]);

  if (isLoading)
    return (
      <div className="p-10 text-center text-slate-500">Đang tải dữ liệu...</div>
    );

  return (
    <div className="p-3 min-h-screen bg-slate-50">
      {/* <div className="p-4 rounded-2xl shadow-sm border mb-4 flex justify-between items-center bg-white overflow-hidden">
        <h1 className="text-4xl font-black text-red-600">
          Hủy cam kết học viên
        </h1>

        <motion.div
          animate={{ x: ["100%", "-450%"] }}
          transition={{ duration: 5, repeat: 0 }}
        >
          <Image
            src="/hoc_vu.png"
            alt="Logo"
            width={140}
            height={30}
            priority
          />
        </motion.div>
      </div> */}

      <div className="flex items-center justify-between mb-4 gap-4 mt-4">
        <div className="relative flex-1 max-w-[500px] group">
          <FiSearch
            className="absolute left-4 top-1/3 -translate-y-1/2 text-slate-400 
                   group-focus-within:text-red-500 transition-colors"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm học viên hoặc lớp..."
            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none 
                    
                   text-sm transition-all bg-white"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl outline-none text-sm bg-white cursor-pointer hover:border-red-300 transition-colors"
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="terminated">Đã hủy cam kết</option>
            <option value="warning_2">Cảnh báo lần 2</option>
            <option value="warning_1">Cảnh báo lần 1</option>
            <option value="none">Tuân thủ tốt</option>
          </select>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className=" border-0 px-4 py-2 text-slate-700 text-sm font-bold flex items-center gap-2  cursor-pointer"
          >
            <FiSettings className="text-lg" />
            Cấu hình
          </button>
          <div className="px-4 py-2 text-red-600 text-sm font-bold">
            Tổng học sinh: {filteredSummary.length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-red-600 text-white">
              <th className="py-2 px-3 text-left font-medium border-r border-red-500">
                Lớp
              </th>
              <th className="py-2 px-3 text-left font-medium border-r border-red-500">
                Học viên
              </th>
              {VIOLATIONS.map((v) => (
                <th
                  key={v.key}
                  className="py-2 px-2 text-center font-medium border-r border-red-500 last:border-r-0"
                >
                  {v.label}
                </th>
              ))}
              <th className="py-2 px-3 text-center font-medium border-r border-red-500">
                Tổng lỗi
              </th>
              <th className="py-2 px-3 text-center font-medium">Tình trạng</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {paginatedSummary.map((row, i) => {
              const status = row.computedStatus || "none";
              const statusConfig = STATUS_MAP[status] ||
                STATUS_MAP.none || {
                  label: "Tuân thủ tốt",
                  color: "text-white",
                  bgColor: "bg-green-600",
                };

              return (
                <tr
                  key={i}
                  className={`transition-colors cursor-pointer hover:bg-red-50 ${selectedStudents.includes(row.studentId || "") ? "bg-red-50" : ""}`}
                >
                  <td className="py-1.5 px-3 whitespace-nowrap border-r">
                    <FiBookOpen className="inline mr-1.5 text-red-700 text-xl" />
                    {row.className}
                  </td>
                  <td className="py-1.5 px-3 font-semibold border-r whitespace-nowrap">
                    {row.studentName}
                  </td>
                  {VIOLATIONS.map((v) => {
                    const count = row.details[v.key] || 0;
                    const threshold =
                      thresholds[`${v.key}_threshold`] ||
                      VIOLATION_RULES[v.key];
                    const isExceeded = count >= threshold;
                    return (
                      <td
                        key={v.key}
                        className={`py-1.5 px-2 text-center border-r last:border-r-0`}
                      >
                        {count}
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-3 text-center font-bold text-red-600 border-r">
                    {row.totalViolations}
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusConfig.color} ${statusConfig.bgColor}`}
                    >
                      {statusConfig.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredSummary.length === 0 && (
          <div className="p-6 text-center text-slate-400 italic">
            Không có dữ liệu phù hợp
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-end items-center gap-4 bg-slate-50">
            <span className="text-sm font-medium text-slate-500">
              {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredSummary.length)}{" "}
              trong số {filteredSummary.length} học viên
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
              >
                <FiChevronLeft className="text-slate-600" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
              >
                <FiChevronRight className="text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsSettingsOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">
                Cấu hình số lần tối đa vi phạm
              </h3>
              <span
                onClick={() => setIsSettingsOpen(false)}
                className="p-2  transition-colors cursor-pointer"
              >
                <FiX className="text-xl text-red-600" />
              </span>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-slate-500 mb-4">
                Thiết lập số lần vi phạm tối đa cho từng loại lỗi trước khi hệ
                thống tự động gửi cảnh báo hoặc buộc thôi học.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 border-b">
                      <th className="py-2 text-left font-medium">Loại lỗi</th>
                      <th className="py-2 text-center font-medium px-4">
                        Cảnh báo Lần 1
                      </th>
                      <th className="py-2 text-center font-medium px-4">
                        Cảnh báo Lần 2
                      </th>
                      <th className="py-2 text-center font-medium px-4 text-red-600">
                        Hủy cam kết
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {VIOLATIONS.map((v) => (
                      <tr
                        key={v.key}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 text-slate-700 font-medium pr-4">
                          {v.label}
                        </td>
                        <td className="py-3 px-1 text-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={thresholds[`${v.key}_threshold`] || ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setThresholds({
                                ...thresholds,
                                [`${v.key}_threshold`]: parseInt(val) || 0,
                              });
                            }}
                            style={{
                              width: `${String(thresholds[`${v.key}_threshold`] || "").length * 9 + 24}px`,
                              minWidth: "50px",
                            }}
                            className="px-2 py-1.5 border rounded-lg text-center outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-red-600"
                          />
                        </td>
                        <td className="py-3 px-1 text-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={thresholds[`${v.key}_warning_2`] || ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setThresholds({
                                ...thresholds,
                                [`${v.key}_warning_2`]: parseInt(val) || 0,
                              });
                            }}
                            style={{
                              width: `${String(thresholds[`${v.key}_warning_2`] || "").length * 9 + 24}px`,
                              minWidth: "50px",
                            }}
                            className="px-2 py-1.5 border rounded-lg text-center outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-red-600"
                          />
                        </td>
                        <td className="py-3 px-1 text-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={thresholds[`${v.key}_terminated`] || ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setThresholds({
                                ...thresholds,
                                [`${v.key}_terminated`]: parseInt(val) || 0,
                              });
                            }}
                            style={{
                              width: `${String(thresholds[`${v.key}_terminated`] || "").length * 9 + 24}px`,
                              minWidth: "50px",
                            }}
                            className="px-2 py-1.5 border rounded-lg text-center outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-red-600"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 text-white text-sm font-bold shadow-lg flex items-center gap-2 transition-all border-0 cursor-pointer"
              >
                {isSaving ? (
                  "Đang lưu..."
                ) : (
                  <>
                    <FiSave />
                    Lưu cấu hình
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Toast */}
      {showSuccessToast && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-10 right-10 z-[9999] bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
        >
          Cập nhật cấu hình thành công!
        </motion.div>
      )}
    </div>
  );
}
