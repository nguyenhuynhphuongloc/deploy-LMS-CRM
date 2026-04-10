/* eslint-disable @typescript-eslint/no-floating-promises */
import { checkSessionFeedback } from "@/app/(app)/(authenticated)/student/exercise/actions";
import { createPeriodicAttempt } from "@/app/(app)/(authenticated)/student/tests/[attemptId]/actions";
import { useAuth } from "@/app/(app)/_providers/Auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TIME_FORMAT_TEST_FULL_MAPPING } from "@/constants";
import { cn, getPeriodicAttemptScore } from "@/lib/utils";
import type { PeriodicTest, PeriodicTestAttempt, Test } from "@/payload-types";
import { format } from "date-fns";
import {
  ArrowRightIcon,
  BookTextIcon,
  CalendarClockIcon,
  CheckIcon,
  ClipboardListIcon,
  FileTextIcon,
  HeadphonesIcon,
  MicIcon,
  PenIcon,
  SheetIcon,
  TimerIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, type JSX, useEffect, useMemo, useState } from "react";
import ConfirmModal from "../modal/ConfirmModal";
import SessionReviewModal from "../modal/SessionReviewModal";

const SKILL_MAPPING: Record<string, { icon: JSX.Element; value: string }> = {
  listening: {
    icon: <HeadphonesIcon />,
    value: "listening",
  },
  writing: {
    icon: <PenIcon />,
    value: "writing",
  },
  speaking: {
    icon: <MicIcon />,
    value: "speaking",
  },
  reading: {
    icon: <BookTextIcon />,
    value: "reading",
  },
  grammar: {
    icon: <SheetIcon />,
    value: "grammar",
  },
  vocab: {
    icon: <ClipboardListIcon />,
    value: "vocab",
  },
};

const STATUS_MAPPING: Record<string | number, { color: string; text: string }> =
  {
    not_submitted: { color: "#E72929", text: "Chưa làm bài" },
    in_progress: { color: "#E72929", text: "Chưa làm bài" },
    completed: { color: "#23BD33", text: "Đã nộp" },
    not_graded_yet: { color: "#23BD33", text: "Chưa chấm" },
    late: { color: "#FBA631", text: "Nộp trễ" },
  };

const CardExercise = ({
  data,
  attempt,
  deadline,
  classId,
  session,
  type,
}: {
  data: PeriodicTest;
  attempt?: PeriodicTestAttempt;
  deadline: Date;
  classId: string;
  session: number;
  type: string;
}): JSX.Element => {
  const { title, id, tests } = data;
  const router = useRouter();
  const { user } = useAuth();
  const [testInfo, setTestInfo] = useState<Test>();
  const [isReviewed, setIsReviewed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const checkReviewed = async () => {
      if (!user || !classId || !session) return;

      // Chỉ yêu cầu review cho 'homework' và 'extra_homework'
      if (!["homework", "extra_homework"].includes(type)) {
        setIsReviewed(true);
        return;
      }

      const reviewed = await checkSessionFeedback({
        userId: user.id,
        classId,
        session,
      });
      console.log("reviewed", reviewed);
      setIsReviewed(reviewed);
    };
    checkReviewed();
  }, [user, classId, session, type]);

  useEffect(() => {
    const getTestInfo = async () => {
      if (!tests?.[0]) return;
      const testId = typeof tests[0] === "string" ? tests[0] : tests[0].id;
      const res = await fetch(`/api/tests/${testId}`);
      const response = (await res.json()) as Test;
      setTestInfo(response);
    };
    getTestInfo();
  }, [tests]);

  const displayScore = useMemo(() => {
    const score = getPeriodicAttemptScore(attempt, data, testInfo);
    if (score === null || typeof score === "string") return score;
    return Number(score).toFixed(1);
  }, [attempt, data, testInfo]);

  const questionStats = useMemo(() => {
    if (!attempt) return null;

    const answerSheet = attempt.answerSheet as any;
    if (!answerSheet) return null;

    const skill = testInfo?.type;
    if (!skill || !["listening", "reading", "grammar", "vocab"].includes(skill))
      return null;
    try {
      const skillData = answerSheet[skill];
      if (!skillData) return null;
      console.log({ skill, skillData });

      let correct = 0;
      let total = 0;

      Object.values(skillData).forEach((part: any) => {
        Object.values(part).forEach((section: any) => {
          total++;
          if (section?.isCorrect) correct++;
        });
      });

      if (total === 0) return null;
      return { correct, total };
    } catch (error) {
      console.error("Error calculating question stats:", error);
    }

    return null;
  }, [attempt, testInfo]);

  const writingSubScores = useMemo(() => {
    if (testInfo?.type !== "writing" || !attempt || !testInfo?.isFullTest)
      return null;
    const writingData = (attempt.answerSheet as any)?.writing || {};
    const t1 = writingData["1"]?.overallScore;
    const t2 = writingData["2"]?.overallScore;

    if (t1 && t2) {
      return {
        task1: Number(t1).toFixed(1),
        task2: Number(t2).toFixed(1),
      };
    }
    return null;
  }, [attempt, testInfo]);

  const getStatus = () => {
    if (!attempt || attempt.status !== "completed") return "not_submitted";
    const isCompleted = attempt.status === "completed";
    const hasScore = displayScore !== null;
    const isLate =
      attempt.completedAt && new Date(attempt.completedAt) > new Date(deadline);

    if (isLate) return "late";
    if (isCompleted && !hasScore) return "not_graded_yet";
    if (isCompleted) return "completed";
    return "not_submitted";
  };

  const status = getStatus();

  const handleDoExercise = async () => {
    const { success, data: attemptData } = await createPeriodicAttempt({
      type: type as any,
      userId: user!.id,
      testId: id,
      classId,
      session,
    });

    if (success) {
      router.replace(`/student/tests/${attemptData!.id}`);
    }
  };

  const handleSkipReview = async () => {
    setShowConfirm(false);
    if (status === "not_submitted") {
      await handleDoExercise();
    } else {
      handleCheckResult();
    }
  };

  const onConfirmReview = async () => {
    setShowConfirm(false);
    setShowReview(true);
  };
  const handleCheckResult = () => {
    router.push(`/test-result?attemptId=${attempt!.id}`);
  };

  if (!testInfo) {
    return (
      <div className="h-[134px] w-full overflow-hidden rounded-2xl bg-white shadow-xl relative p-4">
        <Skeleton className="relative z-1 h-5 w-full rounded-lg overflow-hidden" />

        <Skeleton className="h-7 w-full mt-12" />
      </div>
    );
  }

  return (
    <Card className="relative px-3 pt-[12px] pb-3 bg-[rgba(168,171,178,0.1)] rounded-[12px] h-full flex flex-col justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 pr-[44px]">
          <div className="font-semibold flex items-center gap-2 overflow-hidden">
            <p className="truncate">{title}</p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "rounded-full h-[15px] w-[15px] flex items-center justify-center flex-shrink-0",
                        status === "late"
                          ? "bg-[#FBA631]"
                          : ["completed", "not_graded_yet"].includes(status)
                            ? "bg-[#23BD33]"
                            : "bg-[#E72929]",
                      )}
                    >
                      {["not_submitted", "in_progress"].includes(status) ? (
                        <XIcon width={11} height={11} className="text-white" />
                      ) : (
                        <CheckIcon
                          width={12}
                          height={12}
                          className="text-white"
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    className={cn(
                      status === "late"
                        ? "bg-[#FBA631]"
                        : ["completed", "not_graded_yet"].includes(status)
                          ? "bg-[#23BD33]"
                          : "bg-[#E72929]",
                    )}
                  >
                    <p>{STATUS_MAPPING[status]?.text}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 bg-white h-[42px] w-[42px] flex items-center justify-center text-[#E72929] rounded-bl-xl border-white border-4">
          {testInfo?.type && SKILL_MAPPING[testInfo.type]?.icon}
        </div>

        {deadline ? (
          <div className="flex items-center gap-2 flex-1 mt-2">
            <CalendarClockIcon
              className="text-[#6D737A]"
              width={16}
              height={16}
            />
            {format(deadline || new Date(), "dd/MM/yyyy HH:mm a")}
          </div>
        ) : (
          <p className="text-[14px] mb-[4px]">
            Giáo viên chưa giao hạn nộp bài
          </p>
        )}

        {writingSubScores && (
          <div className="flex items-center justify-between mt-2 text-[16px] font-medium text-[#151515]">
            <p>
              Task 1:{" "}
              <span className="font-bold">{writingSubScores.task1}</span>
            </p>
            <p>
              Task 2:{" "}
              <span className="font-bold">{writingSubScores.task2}</span>
            </p>
          </div>
        )}

        {(questionStats ||
          (["writing", "speaking"].includes(testInfo?.type || "") &&
            displayScore !== null &&
            !isNaN(Number(displayScore)))) && (
          <div className="flex items-center gap-3 mt-3">
            <Progress
              value={
                ["writing", "speaking"].includes(testInfo?.type || "")
                  ? (Number(displayScore) / 9) * 100
                  : (questionStats!.correct / questionStats!.total) * 100
              }
              className="h-2 bg-primary/10"
            />
            {!["writing", "speaking"].includes(testInfo?.type || "") && (
              <p className="text-[14px] font-bold text-[#6D737A] whitespace-nowrap">
                {questionStats!.correct}/{questionStats!.total} câu
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-3 flex-shrink-0">
        <div className="rounded-[10px] bg-white h-[34px] pl-3 flex items-center justify-between">
          <div
            className={cn(
              "flex items-center gap-1 font-bold text-[16px]",
              typeof displayScore === "string" && displayScore.includes("%")
                ? "text-[#23BD33]"
                : "text-[#E72929]",
            )}
          >
            {displayScore !== null ? (
              <Fragment>
                <FileTextIcon width={16} height={16} className="mt-[-2px]" />
                {displayScore}
              </Fragment>
            ) : (
              <Fragment>
                <TimerIcon width={16} height={16} className="mt-[-2px]" />
                {(testInfo?.type &&
                  TIME_FORMAT_TEST_FULL_MAPPING[
                    testInfo.type as keyof typeof TIME_FORMAT_TEST_FULL_MAPPING
                  ]) ||
                  0}{" "}
                phút
              </Fragment>
            )}
          </div>
          {status === "not_submitted" ? (
            isReviewed ? (
              <Button
                className="h-[34px] bg-[#FD4444] rounded-[10px]"
                onClick={handleDoExercise}
              >
                Làm bài
                <ArrowRightIcon width={14} height={14} />
              </Button>
            ) : (
              <Fragment>
                <ConfirmModal
                  title="Đánh giá buổi học"
                  description="Bạn có muốn review buổi học trước khi làm bài không?"
                  confirmText="Có, review ngay"
                  cancelText="Không, làm bài luôn"
                  open={showConfirm}
                  onOpenChange={setShowConfirm}
                  onSubmit={onConfirmReview}
                  onCancel={handleSkipReview}
                  isPending={isPending}
                >
                  <Button
                    className="h-[34px] bg-[#FD4444] rounded-[10px]"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    Làm bài
                    <ArrowRightIcon width={14} height={14} />
                  </Button>
                </ConfirmModal>

                <SessionReviewModal
                  open={showReview}
                  onOpenChange={setShowReview}
                  onSubmit={async () => {
                    setIsReviewed(true);
                    await handleDoExercise();
                  }}
                  classId={classId}
                  session={session}
                >
                  <Fragment />
                </SessionReviewModal>
              </Fragment>
            )
          ) : isReviewed ? (
            <Button
              className="h-[34px] bg-[#FD4444] rounded-[10px]"
              onClick={handleCheckResult}
            >
              Xem lại bài
              <ArrowRightIcon width={14} height={14} />
            </Button>
          ) : (
            <Fragment>
              <ConfirmModal
                title="Đánh giá buổi học"
                description="Bạn có muốn review buổi học trước khi xem kết quả không?"
                confirmText="Có, review ngay"
                cancelText="Không, xem lại bài thôi"
                open={showConfirm}
                onOpenChange={setShowConfirm}
                onSubmit={onConfirmReview}
                onCancel={handleSkipReview}
                isPending={isPending}
              >
                <Button
                  className="h-[34px] bg-[#FD4444] rounded-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  Xem lại bài
                  <ArrowRightIcon width={14} height={14} />
                </Button>
              </ConfirmModal>

              <SessionReviewModal
                open={showReview}
                onOpenChange={setShowReview}
                onSubmit={async () => {
                  setIsReviewed(true);
                  handleCheckResult();
                }}
                classId={classId}
                session={session}
              >
                <Fragment />
              </SessionReviewModal>
            </Fragment>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CardExercise;
