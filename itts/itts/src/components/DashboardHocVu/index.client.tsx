"use client";

import React, { useEffect, useMemo, useState } from "react";

import { format } from "date-fns";
import {
  Award,
  Calendar,
  ChevronRight,
  History,
  Loader2,
  MessageSquare,
  Smile,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { VIOLATION_LABELS } from "../../payload/constants/violationRules";

const COLORS = ["#10B981", "#EF4444", "#F59E0B", "#3B82F6"]; // Green, Red, Yellow, Blue

const DashboardHocVuClient: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [studentViolationDetails, setStudentViolationDetails] = useState<
    Record<string, any>
  >({});

  const [stats, setStats] = useState({
    totalSessions: 0,
    occurredSessions: 0,
    attendanceRate: 0,
    studentCount: 0,
    teacherCount: 0,
    avgSatisfaction: 0,
    homeworkRate: 0,
  });

  const [operationalStats, setOperationalStats] = useState({
    feedbackRate: 0,
    homeworkAssignmentRate: 0,
    weeklyIssues: { feedbacks: 0, homeworks: 0 },
  });

  const [milestoneStats, setMilestoneStats] = useState({
    week3PassRate: 0,
    midtermPassRate: 0,
    week8PassRate: 0,
    finalPassRate: 0,
    expectedEndDate: null as string | null,
    totalSessionsCount: 0,
    midtermSessionIndex: -1,
    finalSessionIndex: -1,
  });

  const [feedbackStats, setFeedbackStats] = useState<{
    week3: {
      total: number;
      completed: number;
      teachers: { name: string; done: boolean }[];
    };
    week8: {
      total: number;
      completed: number;
      teachers: { name: string; done: boolean }[];
    };
  }>({
    week3: { total: 0, completed: 0, teachers: [] },
    week8: { total: 0, completed: 0, teachers: [] },
  });

  const [examStatus, setExamStatus] = useState<{
    mid_term: {
      id: string;
      name: string;
      completed: boolean;
      score?: string;
    }[];
    final_term: {
      id: string;
      name: string;
      completed: boolean;
      score?: string;
    }[];
  }>({ mid_term: [], final_term: [] });

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch(
          "/api/classes?limit=1000&where[status_class][equals]=active",
        );
        const data = await res.json();
        setClasses(data.docs || []);
        if (data.docs?.length > 0) {
          setSelectedClassId(data.docs[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch classes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Class Detail (Depth = 3 to get student.lead.target)
        const classRes = await fetch(`/api/classes/${selectedClassId}?depth=3`);
        const classDetail = await classRes.json();
        setClassData(classDetail);

        // 2. Parallel Fetch: Attendance, Feedback, Homework, and Test Attempts
        const [attRes, fbRes, hwRes, testRes] = await Promise.all([
          fetch(
            `/api/attendanceRecords?where[class][equals]=${selectedClassId}&limit=1000`,
          ),
          fetch(
            `/api/feedback?where[class][equals]=${selectedClassId}&limit=1000`,
          ),
          fetch(
            `/api/homework-assignments?where[class][equals]=${selectedClassId}&limit=1`,
          ),
          fetch(
            `/api/periodic_test_attempts?where[class][equals]=${selectedClassId}&where[status][equals]=completed&limit=1000&depth=2`,
          ),
        ]);

        const attendanceResData = await attRes.json();
        const feedbackResData = await fbRes.json();
        const homeworkResData = await hwRes.json();
        const testAttemptsResData = await testRes.json();

        setFeedbacks(feedbackResData.docs || []);

        // --- FEEDBACK WEEK 3 & 8 STATS ---
        const feedbackDocs = feedbackResData.docs || [];
        const classTeachers = (classDetail.teachers || []).map((t: any) => ({
          id: typeof t.teacher === "object" ? t.teacher.id : t.teacher,
          name:
            typeof t.teacher === "object"
              ? t.teacher.fullName || t.teacher.email || "Giáo viên"
              : "Giáo viên",
        }));
        const classStudents = classDetail.students || [];
        const totalFeedbacksNeeded =
          classTeachers.length * classStudents.length;

        const computeFeedbackForWeek = (weekKey: "week3" | "week8") => {
          // Count how many students each teacher has written feedback for
          const teacherStudentMap: Record<string, Set<string>> = {};
          feedbackDocs.forEach((fb: any) => {
            const fd = fb.feedback_data || {};
            Object.entries(fd).forEach(
              ([studentId, studentEntry]: [string, any]) => {
                const weekComments = studentEntry?.[weekKey];
                if (Array.isArray(weekComments)) {
                  weekComments.forEach((comment: any) => {
                    if (comment.teacherId) {
                      if (!teacherStudentMap[comment.teacherId]) {
                        teacherStudentMap[comment.teacherId] = new Set();
                      }
                      teacherStudentMap[comment.teacherId]!.add(studentId);
                    }
                  });
                }
              },
            );
          });

          // Count total completed feedback entries
          let completedCount = 0;
          feedbackDocs.forEach((fb: any) => {
            const fd = fb.feedback_data || {};
            Object.values(fd).forEach((studentEntry: any) => {
              const weekComments = studentEntry?.[weekKey];
              if (Array.isArray(weekComments)) {
                completedCount += weekComments.length;
              }
            });
          });

          const totalStudents = classStudents.length;
          const teachersList = classTeachers.map((t: any) => ({
            name: t.name,
            done: (teacherStudentMap[t.id]?.size || 0) >= totalStudents,
          }));

          return {
            total: totalFeedbacksNeeded,
            completed: completedCount,
            teachers: teachersList,
          };
        };

        const week3FbStats = computeFeedbackForWeek("week3");
        const week8FbStats = computeFeedbackForWeek("week8");
        setFeedbackStats({ week3: week3FbStats, week8: week8FbStats });
        const attendanceRecords = attendanceResData.docs || [];
        const firstRecord = attendanceRecords[0] || {};
        const attendanceMapping = firstRecord.AttendanceRecord_data || {};
        const sessionsWithAttendance = Object.keys(attendanceMapping).length;

        const homeworkMapping = homeworkResData.docs?.[0]?.data || {};
        const sessionsWithHomework = Object.keys(homeworkMapping).length;

        const sessionList = classDetail.sessions || [];
        const lastSession =
          sessionList.length > 0 ? sessionList[sessionList.length - 1] : null;
        const now = new Date();
        const sessionsInPast = sessionList.filter(
          (s: any) => s.date && new Date(s.date) <= now,
        ).length;

        // Strict time-based progress: number of sessions whose schedule has passed
        const occurredSessions = sessionsInPast || sessionsWithAttendance || 0;

        const studentCount = (classDetail.students || []).length;
        const totalSessions =
          classDetail.course?.totalSessions || sessionList.length || 0;

        // --- ATTENDANCE & SATISFACTION CALCULATION ---
        const totalPossible = studentCount * occurredSessions;
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLate = 0;
        let satisfactionSum = 0;
        let satisfactionCount = 0;

        const studentViolations: Record<string, any> = {};

        attendanceRecords.forEach((record: any) => {
          const data = record.AttendanceRecord_data || {};
          Object.values(data).forEach((status: any) => {
            if (status === "present" || status === "P") totalPresent++;
            else if (status === "absent" || status === "A") totalAbsent++;
            else if (status === "late" || status === "L") totalLate++;
          });

          const violationData = record.ViolationRecord_data || {};

          // Process violations for each student
          Object.values(violationData).forEach((session: any) => {
            const sessionStudents = session?.students || {};
            Object.entries(sessionStudents).forEach(
              ([studentId, violations]: [string, any]) => {
                if (!studentViolations[studentId]) {
                  studentViolations[studentId] = {
                    total: 0,
                    details: Object.fromEntries(
                      Object.keys(VIOLATION_LABELS).map((key) => [key, 0]),
                    ),
                  };
                }

                Object.keys(VIOLATION_LABELS).forEach((vKey) => {
                  if (violations[vKey]) {
                    studentViolations[studentId].details[vKey]++;
                    studentViolations[studentId].total++;
                  }
                });
              },
            );
          });

          // Process satisfaction/feedback if available
          Object.values(violationData).forEach((v: any) => {
            if (v.content && typeof v.satisfaction === "number") {
              satisfactionSum += v.satisfaction;
              satisfactionCount++;
            }
          });
        });

        setStudentViolationDetails(studentViolations);

        const attendanceRate =
          totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;
        const avgSatisfaction =
          satisfactionCount > 0 ? satisfactionSum / satisfactionCount : 0;

        // --- OPERATIONAL STATS ---
        const totalExpectedFeedbacks = studentCount * occurredSessions;
        const actualFeedbacksCount = feedbackResData.totalDocs || 0;
        const feedbackRate =
          totalExpectedFeedbacks > 0
            ? Math.min(
                100,
                Math.round(
                  (actualFeedbacksCount / totalExpectedFeedbacks) * 100,
                ),
              )
            : 0;

        const homeworkAssignmentRate =
          occurredSessions > 0
            ? Math.min(
                100,
                Math.round((sessionsWithHomework / occurredSessions) * 100),
              )
            : 0;

        // --- MILESTONE STATS (% PASS TARGET) ---
        const currentAttempts = testAttemptsResData.docs || [];
        const studentTargets = (classDetail.students || []).reduce(
          (acc: any, student: any) => {
            const target = student.lead?.target || student.target;
            if (target) acc[student.id] = target;
            return acc;
          },
          {},
        );

        const processPassRate = (
          type: string,
          minSession?: number,
          maxSession?: number,
        ) => {
          const typeAttempts = currentAttempts.filter((a: any) => {
            const isType = a.type === type;
            if (!isType) return false;
            if (minSession !== undefined && a.session < minSession)
              return false;
            if (maxSession !== undefined && a.session > maxSession)
              return false;
            return true;
          });
          if (typeAttempts.length === 0) return 0;
          let passed = 0;
          typeAttempts.forEach((attempt: any) => {
            const studentId =
              typeof attempt.user === "object" ? attempt.user.id : attempt.user;
            const targetScore = studentTargets[studentId] || 0;
            const actualScore = parseFloat(
              attempt.score?.score || attempt.score || 0,
            );
            if (actualScore >= targetScore && targetScore > 0) passed++;
          });
          return Math.round((passed / typeAttempts.length) * 100);
        };

        const week3PassRate = processPassRate(
          "mini_test",
          0,
          Math.floor(totalSessions * 0.4),
        );
        const midtermPassRate = processPassRate("mid_term");
        const week8PassRate = processPassRate(
          "mini_test",
          Math.floor(totalSessions * 0.6),
          totalSessions,
        );
        const finalPassRate = processPassRate("final_term");

        // Find Session Indices for Markers (Actual or Planned)
        const getSessionIndex = (type: string) => {
          const attempt = currentAttempts.find((a: any) => a.type === type);
          if (attempt && attempt.session) return attempt.session - 1;

          // Defaults if no attempts found (Planned positions)
          if (type === "mid_term" && totalSessions > 0)
            return Math.floor(totalSessions / 2) - 1;
          if (type === "final_term" && totalSessions > 0)
            return totalSessions - 1;
          return -1;
        };

        const midtermSessionIndex = getSessionIndex("mid_term");
        const finalSessionIndex = getSessionIndex("final_term");

        // Update all states
        setStats({
          totalSessions,
          occurredSessions,
          attendanceRate: Math.round(attendanceRate),
          studentCount,
          teacherCount: (classDetail.teachers || []).length,
          avgSatisfaction,
          homeworkRate: homeworkAssignmentRate, // Corrected: use the actual homework rate calculated earlier
        });

        setOperationalStats({
          feedbackRate,
          homeworkAssignmentRate,
          weeklyIssues: {
            feedbacks: Math.max(
              0,
              totalExpectedFeedbacks - actualFeedbacksCount,
            ),
            homeworks: Math.max(0, occurredSessions - sessionsWithHomework),
          },
        });

        setMilestoneStats({
          week3PassRate,
          midtermPassRate,
          week8PassRate,
          finalPassRate,
          expectedEndDate: lastSession?.date || null,
          totalSessionsCount: sessionList.length || totalSessions,
          midtermSessionIndex,
          finalSessionIndex,
        });

        // --- EXAM COMPLETION STATUS ---
        const students = classDetail.students || [];
        const midtermStatus = students.map((s: any) => {
          const studentId = s.id;
          const attempt = currentAttempts.find(
            (a: any) =>
              a.type === "mid_term" &&
              (typeof a.user === "object"
                ? a.user.id === studentId
                : a.user === studentId),
          );
          return {
            id: studentId,
            name:
              (s.lead && typeof s.lead === "object"
                ? s.lead.fullName
                : s.fullName) || "Học viên",
            completed: !!attempt,
            score: attempt?.score?.score || attempt?.score,
          };
        });

        const finalStatus = students.map((s: any) => {
          const studentId = s.id;
          const attempt = currentAttempts.find(
            (a: any) =>
              a.type === "final_term" &&
              (typeof a.user === "object"
                ? a.user.id === studentId
                : a.user === studentId),
          );
          return {
            id: studentId,
            name:
              (s.lead && typeof s.lead === "object"
                ? s.lead.fullName
                : s.fullName) || "Học viên",
            completed: !!attempt,
            score: attempt?.score?.score || attempt?.score,
          };
        });

        setExamStatus({ mid_term: midtermStatus, final_term: finalStatus });

      } catch (err) {
        console.error("Dashboard Update Failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedClassId]);

  const progressPercentage = Math.round(
    stats.totalSessions > 0
      ? (stats.occurredSessions / stats.totalSessions) * 100
      : 0,
  );

  const isMidtermVisible =
    stats.occurredSessions >= milestoneStats.midtermSessionIndex + 1 ||
    examStatus.mid_term.some((s) => s.completed);

  const isFinalVisible =
    stats.occurredSessions >= milestoneStats.finalSessionIndex + 1 ||
    examStatus.final_term.some((s) => s.completed);

  const violatingStudents = useMemo(() => {
    return (classData?.students || [])
      .filter((s: any) => s.violationStatus && s.violationStatus !== "none")
      .sort((a: any, b: any) => {
        const order: Record<string, number> = {
          terminated: 0,
          warning_2: 1,
          warning_1: 2,
        };
        return (
          (order[a.violationStatus] ?? 3) - (order[b.violationStatus] ?? 3)
        );
      });
  }, [classData?.students]);

  const roadmapMilestones = useMemo(() => {
    const total = milestoneStats.totalSessionsCount || stats.totalSessions || 0;
    if (total <= 0) return [];
    return [
      {
        label: "Tuần 3",
        index: Math.max(0, Math.floor(total * 0.25) - 1),
        color: "bg-red-600",
      },
      {
        label: "Midterm",
        index: Math.max(0, Math.floor(total * 0.5) - 1),
        color: "bg-red-600",
      },
      {
        label: "Tuần 8",
        index: Math.max(0, Math.floor(total * 0.75) - 1),
        color: "bg-red-600",
      },
      { label: "Final", index: total - 1, color: "bg-red-600" },
    ];
  }, [milestoneStats.totalSessionsCount, stats.totalSessions]);

  if (loading && classes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 font-sans">
      {/* Top Bar: Selector & Quick Actions */}
      <div className="bg-white p-7 rounded-[36px] border border-gray-100 italic-none">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-sm w-full flex flex-col gap-2.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-2">
              Danh sách lớp học
            </label>
            <div className="relative group">
              <select
                className="w-full appearance-none rounded-2xl border-2 border-red-600 bg-white px-6 py-4 text-base font-black text-red-600 transition-all hover:bg-red-50 outline-none cursor-pointer pr-12"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.map((cls) => (
                  <option
                    key={cls.id}
                    value={cls.id}
                    className="text-gray-900 bg-white font-bold"
                  >
                    {cls.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-red-600 transition-colors">
                <ChevronRight className="rotate-90 h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap gap-4 items-center mt-10">
            {[
              {
                label: "Sĩ số",
                value: stats.studentCount,
                icon: Users,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Giáo viên",
                value: stats.teacherCount,
                icon: UserCheck,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                label: "Chuyên cần",
                value: `${stats.attendanceRate}%`,
                icon: History,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                label: "Bài tập",
                value: `${stats.homeworkRate}%`,
                icon: Award,
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 rounded-[28px] bg-white px-6 py-4 border-2 border-gray-100 transition-all hover:border-red-600 hover:scale-[1.05]"
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${item.bg} ${item.color}`}
                >
                  <item.icon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-1.5">
                    {item.label}
                  </p>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Academic Milestones & Course Roadmap Section */}
      <div className="rounded-[40px] border-4 border-red-600 bg-white p-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-red-600 uppercase tracking-widest">
              Hành trình & Kết quả mục tiêu
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              Theo dõi các cột mốc quan trọng và tỉ lệ đạt mục tiêu của lớp
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-2xl border border-red-200">
            <Calendar className="h-5 w-5 text-red-600" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-900 uppercase leading-tight">
                Ngày bế giảng dự kiến
              </span>
              <span className="text-sm font-black text-red-600 leading-tight">
                {milestoneStats.expectedEndDate
                  ? format(
                      new Date(milestoneStats.expectedEndDate),
                      "dd/MM/yyyy",
                    )
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Feedback Tuần 3 Card */}
          <div className="relative group rounded-[32px] bg-white p-6 border-2 border-blue-50 flex items-center gap-5 transition-all hover:scale-[1.03] hover:border-blue-500">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Feedback Tuần 3
              </p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-blue-600 leading-none">
                  {feedbackStats.week3.completed}
                </span>
                <span className="text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-tighter">
                  / {feedbackStats.week3.total}
                </span>
              </div>
            </div>
            {/* Hover Popup */}
            <div className="absolute left-0 top-full mt-2 w-80 bg-gray-100 border border-gray-400 rounded-2xl shadow-2xl p-5 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3">
                Trạng thái giáo viên - Tuần 3
              </p>
              {feedbackStats.week3.teachers.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  Chưa có giáo viên
                </p>
              ) : (
                <div className="space-y-2">
                  {feedbackStats.week3.teachers.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-xs shadow-sm">
                          {t.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-gray-700">
                          {t.name}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${t.done ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                      >
                        {t.done ? "Hoàn thành" : "Chưa hoàn thành"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mục tiêu Giữa kì Card */}
          <div className="rounded-[32px] bg-white p-6 border-2 border-red-50 flex items-center gap-5 transition-all hover:scale-[1.03] hover:border-red-600">
            <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-900">
              <Target className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Mục tiêu Giữa kì
              </p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-red-900 leading-none">
                  {milestoneStats.midtermPassRate}%
                </span>
                <span className="text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-tighter">
                  Học viên đạt Target
                </span>
              </div>
            </div>
          </div>

          {/* Feedback Tuần 8 Card */}
          <div className="relative group rounded-[32px] bg-white p-6 border-2 border-red-50 flex items-center gap-5 transition-all hover:scale-[1.03] hover:border-red-500">
            <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Feedback Tuần 8
              </p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-red-600 leading-none">
                  {feedbackStats.week8.completed}
                </span>
                <span className="text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-tighter">
                  / {feedbackStats.week8.total}
                </span>
              </div>
            </div>
            {/* Hover Popup */}
            <div className="absolute left-0 top-full mt-2 w-80 bg-gray-100 border border-gray-400 rounded-2xl shadow-2xl p-5 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3">
                Trạng thái giáo viên - Tuần 8
              </p>
              {feedbackStats.week8.teachers.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  Chưa có giáo viên
                </p>
              ) : (
                <div className="space-y-2">
                  {feedbackStats.week8.teachers.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-xs shadow-sm">
                          {t.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-gray-700">
                          {t.name}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${t.done ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                      >
                        {t.done ? "Hoàn thành" : "Chưa hoàn thành"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mục tiêu Cuối kì Card */}
          <div className="rounded-[32px] bg-white p-6 border-2 border-pink-50 flex items-center gap-5 transition-all hover:scale-[1.03] hover:border-pink-500">
            <div className="h-16 w-16 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600">
              <Award className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Mục tiêu Cuối kì
              </p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-pink-600 leading-none">
                  {milestoneStats.finalPassRate}%
                </span>
                <span className="text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-tighter">
                  Học viên đạt Target
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-red-600 uppercase tracking-widest">
                Hành trình khóa học
              </span>
              <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100 shadow-sm ml-2">
                {stats.occurredSessions} / {milestoneStats.totalSessionsCount}{" "}
                BUỔI
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-gray-400 uppercase">
                  Tiến độ
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.4)]" />
                <span className="text-[9px] font-bold text-gray-400 uppercase">
                  Kỳ thi trọng tâm
                </span>
              </div>
            </div>
          </div>

          <div className="relative pt-8 pb-10">
            <div className="h-6 w-full rounded-full bg-gray-100 relative shadow-inner">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out relative"
                style={{
                  width: `${Math.round((stats.occurredSessions / Math.max(1, milestoneStats.totalSessionsCount)) * 100)}%`,
                }}
              >
                <div className="absolute right-0 top-full mt-1 flex flex-col items-center -translate-x-1/2">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-emerald-500 mb-1" />
                  <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                    BUỔI {stats.occurredSessions}
                  </span>
                </div>
              </div>

              {roadmapMilestones.map((milestone, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 flex flex-col items-center -translate-x-1/2"
                  style={{
                    left: `${((milestone.index + 1) / Math.max(1, milestoneStats.totalSessionsCount)) * 100}%`,
                  }}
                >
                  <div className="absolute -top-7 flex flex-col items-center">
                    <span
                      className={`bg-white border ${milestone.color.replace("bg-", "border-")} ${milestone.color.replace("bg-", "text-")} text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm uppercase whitespace-nowrap`}
                    >
                      {milestone.label}
                    </span>
                  </div>
                  <div
                    className={`h-6 w-1.5 rounded-full ${milestone.color} border-2 border-white shadow-sm z-10`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!loading && classData ? (
        <div className="space-y-12">
          {/* Exam Completion Status Section */}
          {(isMidtermVisible || isFinalVisible) && (
            <div className="rounded-[40px] border border-gray-100 bg-white p-10 shadow-sm">
            <div className="mb-8">
              <h3 className="text-2xl font-black text-red-600 uppercase tracking-tighter">
                Theo dõi hoàn thành bài thi
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Danh sách học viên đã thực hiện bài kiểm tra định kỳ (Midterm & Final)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
                    <th className="px-8 py-4 text-left bg-gray-50/50 rounded-l-2xl">
                      Học viên
                    </th>
                    {isMidtermVisible && (
                      <th className={`px-4 py-4 text-center bg-emerald-50/50 text-emerald-600 border-x border-emerald-100 ${!isFinalVisible ? 'rounded-r-2xl' : ''}`}>
                        Midterm
                      </th>
                    )}
                    {isFinalVisible && (
                      <th className="px-8 py-4 text-center bg-red-50/50 text-red-600 rounded-r-2xl border-l border-red-100">
                        Final
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {examStatus.mid_term.length === 0 ? (
                    <tr>
                      <td
                        colSpan={1 + (isMidtermVisible ? 1 : 0) + (isFinalVisible ? 1 : 0)}
                        className="py-20 text-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100"
                      >
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Chưa có dữ liệu học viên
                        </p>
                      </td>
                    </tr>
                  ) : (
                    examStatus.mid_term.map((student, idx) => {
                      const final = examStatus.final_term[idx];
                      return (
                        <tr
                          key={student.id}
                          className="group hover:bg-gray-50/50 transition-all font-sans"
                        >
                          {/* Student Name */}
                          <td className={`px-8 py-4 bg-white border-y border-l border-gray-100 rounded-l-[28px] ${(!isMidtermVisible && !isFinalVisible) ? 'rounded-r-[28px] border-r' : ''}`}>
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-red-600 border border-red-700 flex items-center justify-center font-black text-white text-base shadow-sm group-hover:scale-110 transition-all">
                                {student.name.charAt(0)}
                              </div>
                              <span className="text-sm font-black text-gray-800 uppercase tracking-tight group-hover:text-red-600 transition-colors">
                                {student.name}
                              </span>
                            </div>
                          </td>

                          {/* Midterm Status (Green) */}
                          {isMidtermVisible && (
                            <td className={`px-4 py-4 bg-white border-y border-gray-100 text-center ${!isFinalVisible ? 'rounded-r-[28px] border-r' : ''}`}>
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-block px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${
                                    student.completed
                                      ? "bg-emerald-600 text-white shadow-emerald-100"
                                      : "bg-red-600 text-white shadow-red-100"
                                  }`}
                                >
                                  {student.completed ? "Đủ" : "Thiếu"}
                                </span>
                                {student.completed && student.score && (
                                  <span className="text-[11px] font-black text-emerald-800">
                                    {student.score}đ
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Final Status (Red) */}
                          {isFinalVisible && (
                            <td className="px-8 py-4 bg-white border-y border-r border-gray-100 rounded-r-[28px] text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-block px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${
                                    final?.completed
                                      ? "bg-red-600 text-white shadow-red-100"
                                      : "bg-red-600 text-white shadow-red-100 opacity-60"
                                  }`}
                                >
                                  {final?.completed ? "Đủ" : "Thiếu"}
                                </span>
                                {final?.completed && final.score && (
                                  <span className="text-[11px] font-black text-red-800">
                                    {final.score}đ
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

          <div className="rounded-[40px] border border-gray-100 bg-white p-10">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-black text-red-600 uppercase tracking-tighter">
                Danh sách học viên cần theo dõi
              </h3>
            </div>

            {violatingStudents.length === 0 ? (
              <div className="text-center py-24 bg-emerald-50/20 rounded-[40px] border border-emerald-100">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6">
                  <Smile className="h-10 w-10" />
                </div>
                <h4 className="text-xl font-black text-emerald-900 uppercase tracking-tight">
                  Lớp học hiện tại ổn định
                </h4>
                <p className="text-xs font-bold text-emerald-600/60 uppercase mt-2 tracking-widest">
                  Không có học viên nào thuộc diện cảnh báo
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="overflow-x-auto pb-4">
                  <table className="w-full border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
                        <th className="px-8 py-3 text-left bg-gray-50/50 rounded-l-2xl">
                          Học viên
                        </th>
                        {Object.values(VIOLATION_LABELS).map((label, i) => (
                          <th
                            key={i}
                            className="px-4 py-3 text-center bg-gray-50/50"
                          >
                            {label}
                          </th>
                        ))}
                        <th className="px-8 py-3 text-right bg-gray-50/50 rounded-r-2xl">
                          Tình trạng
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {violatingStudents.map((student: any, idx: number) => {
                        const statusStyles = {
                          warning_1:
                            "bg-orange-50 text-orange-600 border-orange-100",
                          warning_2:
                            "bg-amber-50 text-amber-600 border-amber-100",
                          terminated: "bg-red-50 text-red-600 border-red-100",
                        };
                        const statusLabel = {
                          warning_1: "Cảnh báo L1",
                          warning_2: "Cảnh báo L2",
                          terminated: "Hủy cam kết",
                        };

                        const violationInfo = studentViolationDetails[
                          student.id
                        ] || {
                          total: 0,
                          details: Object.fromEntries(
                            Object.keys(VIOLATION_LABELS).map((key) => [
                              key,
                              0,
                            ]),
                          ),
                        };

                        return (
                          <tr
                            key={idx}
                            className="group hover:bg-gray-50/50 transition-all"
                          >
                            <td className="px-8 py-4 bg-white border-y border-l border-gray-100 rounded-l-[28px]">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-red-600 border border-red-700 shadow-sm flex items-center justify-center font-black text-white text-base">
                                  {(student.lead &&
                                  typeof student.lead === "object"
                                    ? student.lead.fullName
                                    : student.fullName
                                  )?.charAt(0) || "S"}
                                </div>
                                <div className="text-sm font-black text-gray-900 uppercase tracking-tight group-hover:text-red-600 transition-colors">
                                  {(student.lead &&
                                  typeof student.lead === "object"
                                    ? student.lead.fullName
                                    : student.fullName) || "Chưa cập nhật"}
                                </div>
                              </div>
                            </td>
                            {Object.keys(VIOLATION_LABELS).map((key) => {
                              const count = violationInfo.details[key] || 0;
                              return (
                                <td
                                  key={key}
                                  className="px-4 py-4 bg-white border-y border-gray-100 text-center"
                                >
                                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full font-black text-xs bg-red-600 text-white shadow-lg shadow-red-100">
                                    {count}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-8 py-4 bg-white border-y border-r border-gray-100 rounded-r-[28px] text-right">
                              <span
                                className={`inline-block px-4 py-1.5 rounded-full border text-[9px] font-black uppercase whitespace-nowrap
                                                      ${statusStyles[student.violationStatus as keyof typeof statusStyles] || "bg-gray-100"}`}
                              >
                                {statusLabel[
                                  student.violationStatus as keyof typeof statusLabel
                                ] || student.violationStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-gray-50 rounded-[48px] border-2 border-dashed border-gray-200">
          <TrendingUp className="h-24 w-24 text-gray-200 mb-8" />
          <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-base italic-none">
            Vui lòng chọn lớp học để bắt đầu phân tích dữ liệu
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardHocVuClient;
