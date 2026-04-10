import type { Class } from "@/payload-types";
import { addDays, getDay, startOfDay } from "date-fns";
import type { CollectionBeforeChangeHook } from "payload";
import { convertToVietnamTime } from "../utilities/convertDate";

export const beforeChangeClasses: CollectionBeforeChangeHook<Class> = async ({
  data,
  req,
  originalDoc,
}) => {
  const { payload } = req;
  const fullData = { ...(originalDoc || {}), ...data } as Class;

  const {
    days_of_week: topLevelDays,
    time_per_session,
    session_time: groupSessionTime,
    course: courseId,
    startDate,
    status_class,
    type_class,
    total_hours: totalHoursRaw,
    teachers,
  } = fullData;

  const total_hours = Number(totalHoursRaw) || 0;
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // --- HELPERS: Kiểm tra hợp lệ ---
  const getTeacherId = (teacher: any) =>
    typeof teacher === "object" ? teacher?.id : teacher;

  const isValidTeacher = (t: any) => {
    if (!t) return false;
    if (!getTeacherId(t.teacher)) return false;
    if (!t.days_of_week || t.days_of_week.length === 0) return false;
    if (type_class === "one_to_one" && (Number(t.duration) || 0) <= 0)
      return false;
    return true;
  };

  const isValidSession = (s: any) => {
    if (!s || !s.date) return false;
    if (!getTeacherId(s.teacher)) return false;
    if (type_class === "one_to_one" && (Number(s.duration) || 0) <= 0)
      return false;
    return true;
  };

  const sanitizeTeachers = (ts: any[] | null | undefined, type: string) =>
    (ts || []).map((t: any) => {
      const teacherId =
        typeof t.teacher === "object" ? t.teacher?.id : t.teacher;
      const base: any = {
        days_of_week: Array.isArray(t.days_of_week)
          ? [...t.days_of_week].sort()
          : [],
        teacher: teacherId,
      };
      if (type === "one_to_one") {
        base.duration = Number(t.duration) || 0;
        base.session_time = t.session_time
          ? new Date(t.session_time).toISOString()
          : null;
      }
      return base;
    });

  const validTeachers = (teachers || []).filter(isValidTeacher);

  const teachersBefore = sanitizeTeachers(
    originalDoc?.teachers,
    type_class as string,
  );
  const teachersAfter = sanitizeTeachers(
    data.teachers || originalDoc?.teachers,
    type_class as string,
  );

  const isTeachersChanged =
    JSON.stringify(teachersBefore) !== JSON.stringify(teachersAfter);

  const isStartDateChanged =
    data.startDate &&
    originalDoc?.startDate &&
    new Date(data.startDate).getTime() !==
      new Date(originalDoc.startDate).getTime();

  let shouldRegenerate =
    !originalDoc || isTeachersChanged || isStartDateChanged;

  // --- LOGIC CHO LỚP 1-1 ---
  if (type_class === "one_to_one") {
    const isTotalHoursChanged =
      data.total_hours !== undefined &&
      originalDoc?.total_hours !== undefined &&
      Number(data.total_hours) !== Number(originalDoc.total_hours);

    shouldRegenerate = shouldRegenerate || isTotalHoursChanged;

    // Chỉ thực hiện recalculate/generate lại sessions khi teacher/startDate/total_hours thay đổi
    if (shouldRegenerate) {
      // 1. Lọc và làm sạch các buổi học cũ (chỉ giữ buổi hợp lệ nếu là active)
      const rawIncoming = data.sessions || originalDoc?.sessions || [];
      const incomingSessions = (rawIncoming as any[]).filter(isValidSession);

      let keptSessions: any[] = [];

      // Luôn giữ buổi học cũ nếu có ngày trong quá khứ
      keptSessions = incomingSessions.filter(
        (s: any) => new Date(s.date) < now,
      );

      if (originalDoc?.sessions) {
        const originalValidPastSessions = (originalDoc.sessions as any[])
          .filter(isValidSession)
          .filter((s: any) => new Date(s.date) < now);

        originalValidPastSessions.forEach((os: any) => {
          if (!keptSessions.find((is: any) => is.id === os.id)) {
            keptSessions.push(os);
          }
        });
      }

      keptSessions.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      // 2. Tính số giờ đã dùng từ các buổi hợp lệ
      const usedHours = keptSessions.reduce(
        (sum, s) => sum + (Number(s.duration) || 0),
        0,
      );
      const remainingHours = total_hours - usedHours;

      const futureSessions: any[] = [];
      if (remainingHours > 0.01 && validTeachers.length > 0) {
        // 3. Xác định ngày bắt đầu
        let startSearchDate: Date;
        if (keptSessions.length > 0) {
          const lastSession = keptSessions[keptSessions.length - 1];
          if (lastSession?.date) {
            startSearchDate = addDays(new Date(lastSession.date), 1);
          } else {
            startSearchDate = startDate ? new Date(startDate) : now;
          }
        } else {
          startSearchDate = startDate ? new Date(startDate) : now;
        }

        // 4. Xác định tập hợp các ngày học
        let activeDays = topLevelDays || [];
        if (activeDays.length === 0) {
          const unionDays = new Set<string>();
          validTeachers.forEach((t: any) =>
            t.days_of_week?.forEach((d: string) => unionDays.add(d)),
          );
          activeDays = Array.from(unionDays) as any[];
        }

        let currentFutureHours = 0;
        let iterateDate = startSearchDate;
        let iterCount = 0;

        while (
          currentFutureHours < remainingHours - 0.01 &&
          futureSessions.length < 500 &&
          iterCount < 1000
        ) {
          iterCount++;
          const dayString = String(getDay(iterateDate));

          if (activeDays.includes(dayString as any)) {
            const tTemplate = validTeachers.find((t: any) =>
              t.days_of_week?.includes(dayString),
            );
            if (tTemplate) {
              const date = startOfDay(convertToVietnamTime(iterateDate));
              if (tTemplate.session_time) {
                const tTime = new Date(tTemplate.session_time);
                date.setHours(tTime.getHours(), tTime.getMinutes(), 0, 0);
              }

              let duration = Number(tTemplate.duration) || 0;
              if (currentFutureHours + duration > remainingHours) {
                duration = remainingHours - currentFutureHours;
              }

              if (duration > 0.01) {
                futureSessions.push({
                  date,
                  teacher: tTemplate.teacher,
                  session_time: tTemplate.session_time,
                  duration,
                });
                currentFutureHours += duration;
              }
            }
          }
          iterateDate = addDays(iterateDate, 1);
          if (iterateDate > addDays(now, 3650)) break;
        }
      }

      const finalSessions = [...keptSessions, ...futureSessions];
      payload.logger.info(
        `[Classes Hook] === RESULT: keptSessions=${keptSessions.length}, futureSessions=${futureSessions.length}, TOTAL=${finalSessions.length} ===`,
      );
      data.sessions = [...keptSessions, ...futureSessions] as any;
    } else if (data.sessions) {
      data.sessions = (data.sessions as any[]).filter(isValidSession);
    }
    return data;
  }

  if (type_class === "group") {
    const isSessionTimeChanged = data.session_time && originalDoc?.session_time && new Date(data.session_time).getTime() !== new Date(originalDoc.session_time).getTime();
    const isTimePerSessionChanged = data.time_per_session !== undefined && originalDoc?.time_per_session !== undefined && Number(data.time_per_session) !== Number(originalDoc.time_per_session);

    shouldRegenerate = shouldRegenerate || isSessionTimeChanged || isTimePerSessionChanged;

    if (shouldRegenerate) {
      const rawIncoming = data.sessions || originalDoc?.sessions || [];
      const incomingSessions = (rawIncoming as any[]).filter(isValidSession);
      let keptSessions: any[] = [];
      keptSessions = incomingSessions.filter(
        (s: any) => new Date(s.date) < todayStart,
      );
      if (originalDoc?.sessions) {
        const originalValidPast = (originalDoc.sessions as any[])
          .filter(isValidSession)
          .filter((s: any) => new Date(s.date) < todayStart);
        originalValidPast.forEach((os: any) => {
          if (!keptSessions.find((is: any) => is.id === os.id))
            keptSessions.push(os);
        });
      }
      keptSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (courseId && startDate) {
        const course = await payload.findByID({ collection: "courses", id: typeof courseId === "object" ? courseId.id : courseId });
        const totalSessions = Math.ceil((course?.total_hours || 0) / (time_per_session || 1));
        let commonHour = 0, commonMinute = 0;
        if (groupSessionTime) {
          const sStart = new Date(groupSessionTime);
          if (!isNaN(sStart.getTime())) { commonHour = sStart.getHours(); commonMinute = sStart.getMinutes(); }
        }

        const futureSessions: any[] = [];
        let iterateDate = new Date(startDate);
        if (keptSessions.length > 0)
          iterateDate = addDays(
            new Date(keptSessions[keptSessions.length - 1].date),
            1,
          );


        let iterCount = 0;
        const totalNeeded = totalSessions - keptSessions.length;
        while (futureSessions.length < totalNeeded && futureSessions.length < 500 && iterCount < 1000) {
          iterCount++;
          const dayString = String(getDay(iterateDate));
          if (topLevelDays?.includes(dayString as any)) {
            const tTemplate = validTeachers.find((t: any) => t.days_of_week?.includes(dayString));
            if (tTemplate) {
              const date = startOfDay(convertToVietnamTime(iterateDate));
              date.setHours(commonHour, commonMinute, 0, 0);
              futureSessions.push({ date, teacher: tTemplate.teacher });
            }
          }
          iterateDate = addDays(iterateDate, 1);
          if (iterateDate > addDays(todayStart, 3650)) break;
        }
        data.sessions = [...keptSessions, ...futureSessions] as any;
      }
    } else if (data.sessions) {
      data.sessions = (data.sessions as any[]).filter(isValidSession);
    }
    return data;
  }

  return data;
};

export default beforeChangeClasses;
