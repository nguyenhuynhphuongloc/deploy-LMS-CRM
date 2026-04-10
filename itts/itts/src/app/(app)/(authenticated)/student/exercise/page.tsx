"use client";
import PageLoading from "@/components/PageLoading";
import { ClassSelector } from "./_components/ClassSelector";
import { ExerciseSection } from "./_components/ExerciseSection";
import { OverviewCards } from "./_components/OverviewCards";
import { SessionNavigator } from "./_components/SessionNavigator";
import { useExerciseData } from "./_components/useExerciseData";

export default function ExercisePage() {
  const {
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
    homeworkAssignment,
    attendanceData,
    user,
    setClasses,
    setTab,
    setSession,
  } = useExerciseData();

  if (isLoading || !classData || !session || !classes) {
    return <PageLoading />;
  }

  if (!classData || classData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 bg-white rounded-2xl shadow-sm border border-slate-100">
        <p className="text-lg font-bold">Bạn chưa được gán vào lớp học nào.</p>
        <p className="text-sm">Vui lòng liên hệ Admin để được hỗ trợ.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ClassSelector
        currentClassId={classes.id}
        classes={classData}
        onClassChange={setClasses}
      />

      <OverviewCards classInfo={classProgressInfo} />

      <SessionNavigator
        session={session}
        classes={classes}
        sessionInfo={sessionInfo}
        learnedSession={learnedSession}
        attendanceData={attendanceData}
        userId={user?.id as string}
        onSessionChange={setSession}
        recordingLink={homeworkAssignment?.data?.[session - 1]?.link_recording}
      />

      <ExerciseSection
        classId={classes.id}
        session={session}
        tab={tab}
        onTabChange={setTab}
        exercises={exercises}
        homeworkAttempts={homeworkAttempts}
        deadline={deadline}
        sessionInfo={sessionInfo}
        homeworkAssignment={homeworkAssignment}
        typeClass={classes.type_class as string}
        allSessions={classes.sessions || undefined}
      />
    </div>
  );
}
