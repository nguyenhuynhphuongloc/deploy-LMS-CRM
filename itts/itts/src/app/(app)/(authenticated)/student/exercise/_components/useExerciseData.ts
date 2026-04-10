"use client";
import { useAuth } from "@/app/(app)/_providers/Auth";
import { getLastPastIndexPlusOne } from "@/lib/utils";
import { Class, PeriodicTest, PeriodicTestAttempt } from "@/payload-types";
import { useQuery } from "@tanstack/react-query";
import { get } from "lodash-es";
import { stringify } from "qs-esm";
import { useEffect, useMemo, useState } from "react";

export const useExerciseData = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class>();
  const [tab, setTab] = useState("homework");
  const [session, setSession] = useState<number>(1);
  const [homeworkAssignment, setHomeworkAssignment] = useState<any>(null);
  const [homeworkAttempts, setHomeworkAttempts] = useState<
    PeriodicTestAttempt[]
  >([]);
  const [allTests, setAllTests] = useState<PeriodicTest[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>(null);

  const [isHomeworkLoading, setIsHomeworkLoading] = useState(false);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  const stringifiedQuery = useMemo(
    () =>
      stringify(
        { where: { students: { in: user?.id } }, limit: 0 },
        { addQueryPrefix: true },
      ),
    [user?.id],
  );

  const { data: rawClassData, isLoading: isClassLoading } = useQuery<Class[]>({
    queryKey: ["getClassSession", user?.id],
    queryFn: () =>
      fetch(`/api/classes${stringifiedQuery}`)
        .then((res) => res.json())
        .then((res) => res.docs || []),
    enabled: !!user?.id,
    refetchOnMount: "always",
  });

  const classData = useMemo(() => {
    if (!rawClassData) return [];
    const seen = new Set();
    return rawClassData.filter((cls) => {
      if (seen.has(cls.id)) return false;
      seen.add(cls.id);
      return true;
    });
  }, [rawClassData]);

  useEffect(() => {
    if (classData && classData.length > 0 && !classes) {
      setClasses(classData[0]);
    }
  }, [classData, classes]);

  // Fetch HomeworkAssignment for the current class
  useEffect(() => {
    const fetchHomeworkAssignment = async () => {
      if (!classes?.id) return;
      try {
        const res = await fetch(
          `/api/homework-assignments?where[class][equals]=${classes.id}&limit=1`,
        );
        const data = await res.json();
        if (data.docs && data.docs.length > 0) {
          setHomeworkAssignment(data.docs[0]);
        } else {
          setHomeworkAssignment(null);
        }
      } catch (error) {
        console.error("Error fetching HomeworkAssignment:", error);
      }
    };
    fetchHomeworkAssignment();
  }, [classes?.id]);

  // Fetch all assigned PeriodicTests and Attempts
  useEffect(() => {
    const fetchData = async () => {
      if (!classes || !user || !homeworkAssignment) {
        setHomeworkAttempts([]);
        setAllTests([]);
        return;
      }
      setIsHomeworkLoading(true);
      try {
        const data = homeworkAssignment.data || {};
        const allTestIds: string[] = [];

        Object.values(data).forEach((sessionData: any) => {
          if (sessionData.homework) allTestIds.push(...sessionData.homework);
          if (sessionData.extra_homework)
            allTestIds.push(...sessionData.extra_homework);
          if (sessionData.mid_test) allTestIds.push(...sessionData.mid_test);
          if (sessionData.final_test)
            allTestIds.push(...sessionData.final_test);
        });

        const uniqueIds = [...new Set(allTestIds)];

        if (uniqueIds.length === 0) {
          setHomeworkAttempts([]);
          setAllTests([]);
          return;
        }

        // Fetch Test Docs
        const testQuery = stringify(
          { where: { id: { in: uniqueIds } }, limit: 0 },
          { addQueryPrefix: true },
        );
        const testsRes = await fetch(`/api/periodic_tests${testQuery}`);
        const testsData = await testsRes.json();
        setAllTests(testsData.docs || []);

        // Fetch Attempts
        const attemptQuery = stringify(
          {
            where: {
              user: { equals: user?.id },
              class: { equals: classes.id },
              test: { in: uniqueIds },
              type: {
                in: ["homework", "extra_homework", "mid_term", "final_term"],
              },
            },
            limit: 1000,
            depth: 3,
          },
          { addQueryPrefix: true },
        );
        const attemptsRes = await fetch(
          `/api/periodic_test_attempts${attemptQuery}`,
        );
        const attemptsData = await attemptsRes.json();
        setHomeworkAttempts(attemptsData.docs || []);
      } catch (error) {
        console.error("Error fetching homework data:", error);
      } finally {
        setIsHomeworkLoading(false);
      }
    };
    fetchData();
  }, [classes, user, homeworkAssignment]);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!classes || !user) {
        setAttendanceData(null);
        return;
      }
      setIsAttendanceLoading(true);
      try {
        const query = stringify(
          { where: { class: { equals: classes.id } } },
          { addQueryPrefix: true },
        );
        const response = await fetch(`/api/attendanceRecords${query}`);
        const data = await response.json();
        if (data.docs && data.docs.length > 0) {
          setAttendanceData(data.docs[0].AttendanceRecord_data || {});
        } else {
          setAttendanceData({});
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setIsAttendanceLoading(false);
      }
    };
    fetchAttendance();
  }, [classes, user]);

  const isLoading = isClassLoading || isHomeworkLoading || isAttendanceLoading;

  const learnedSession = useMemo(
    () => getLastPastIndexPlusOne((classes?.sessions as any) || []),
    [classes?.sessions],
  );

  useEffect(() => {
    if (learnedSession) {
      setSession(learnedSession);
    }
  }, [learnedSession]);

  const sessionInfo = classes ? get(classes, `sessions[${session - 1}]`) : null;

  const exercises = useMemo(() => {
    if (!homeworkAssignment || !allTests.length) return [];

    let sessionData = homeworkAssignment.data?.[session - 1] || {};

    // Logic to merge periodic/midterm tests into the current session if it matches a milestone
    const sessions = (classes?.sessions as any[]) || [];
    if (classes?.type_class === "one_to_one") {
      let cumulativeHours = 0;
      for (let i = 0; i < session; i++) {
        const duration = Number(sessions[i]?.duration) || 0;
        const prevCumulative = cumulativeHours;
        cumulativeHours += duration;

        if (i === session - 1) {
          // Check if this session crosses any 24h milestone
          const milestoneN = Math.floor(cumulativeHours / 24);
          const prevMilestoneN = Math.floor(prevCumulative / 24);

          if (milestoneN > prevMilestoneN) {
            const periodicKey = `periodic-${milestoneN}`;
            const periodicData = homeworkAssignment.data?.[periodicKey];
            if (periodicData) {
              sessionData = {
                ...sessionData,
                mid_test: [...(sessionData.mid_test || []), ...(periodicData.mid_test || [])],
              };
            }
          }
        }
      }
    } else if (classes?.type_class === "group") {
      const midPoint = Math.floor(sessions.length / 2);
      if (session === midPoint) {
        const midtermData = homeworkAssignment.data?.["midterm"];
        if (midtermData) {
          sessionData = {
            ...sessionData,
            mid_test: [...(sessionData.mid_test || []), ...(midtermData.mid_test || [])],
          };
        }
      }
    }

    if (session === sessions.length) {
      const finalData = homeworkAssignment.data?.["final"];
      if (finalData) {
        sessionData = {
          ...sessionData,
          final_test: [...(sessionData.final_test || []), ...(finalData.final_test || [])],
        };
      }
    }

    let testIds: string[] = [];

    switch (tab) {
      case "homework":
        testIds = sessionData.homework || [];
        break;
      case "extra_homework":
        testIds = sessionData.extra_homework || [];
        break;
      case "mid_term":
        testIds = sessionData.mid_test || [];
        break;
      case "final_term":
        testIds = sessionData.final_test || [];
        break;
    }

    return allTests.filter((t) => testIds.includes(t.id));
  }, [tab, session, homeworkAssignment, allTests, classes]);

  const deadline = useMemo(() => {
    const duration =
      classes?.type_class === "one_to_one"
        ? Number(sessionInfo?.duration) || 0
        : Number(classes?.time_per_session) || 0;

    if (!sessionInfo?.date || duration === 0) return new Date();
    const d = new Date(sessionInfo.date);
    d.setHours(d.getHours() + duration);
    d.setDate(d.getDate() + 5);
    return d;
  }, [sessionInfo, classes]);

  const classProgressInfo = useMemo(() => {
    if (!classes) return [];
    const currentData = homeworkAssignment?.data || {};

    const maxHomework = Object.values(currentData)
      .map((s: any) => s.homework?.length || 0)
      .reduce((a, b: number) => a + b, 0);

    const maxExtraHomework = Object.values(currentData)
      .map((s: any) => s.extra_homework?.length || 0)
      .reduce((a, b: number) => a + b, 0);

    return [
      {
        name: "Course progress",
        sub: "Tiến độ khóa học",
        value: learnedSession || 0,
        max: classes.sessions?.length || 0,
      },
      {
        name: "Attendance",
        sub: "Điểm danh",
        value: attendanceData
          ? Object.values(attendanceData).filter(
              (s: any) =>
                s[user?.id as string]?.status === "on_time" ||
                s[user?.id as string]?.status === "late",
            ).length
          : 0,
        max: classes.sessions?.length || 0,
      },
      {
        name: "Homework",
        sub: "Bài tập về nhà",
        value: homeworkAttempts.filter(
          (i) => i.status === "completed" && i.type === "homework",
        ).length,
        max: maxHomework,
      },
      {
        name: "Extra Practice",
        sub: "Bài tập bổ trợ",
        value: homeworkAttempts.filter(
          (i) => i.status === "completed" && i.type === "extra_homework",
        ).length,
        max: maxExtraHomework,
      },
    ];
  }, [
    classes,
    learnedSession,
    homeworkAttempts,
    attendanceData,
    user?.id,
    homeworkAssignment,
  ]);

  return {
    user,
    classData,
    classes,
    isLoading,
    tab,
    session,
    homeworkAttempts,
    learnedSession,
    sessionInfo,
    exercises,
    deadline,
    classProgressInfo,
    homeworkAssignment, // Exported to help ExerciseSection know about tabs
    attendanceData,
    setClasses,
    setTab,
    setSession,
  };
};
