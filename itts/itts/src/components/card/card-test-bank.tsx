"use client";
import SelectMode from "@/app/(app)/(authenticated)/student/tests/[attemptId]/SelectModeModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getPeriodicAttemptScore } from "@/lib/utils";
import {
  type PeriodicTest,
  type PeriodicTestAttempt,
  type Test,
} from "@/payload-types";
import {
  ArrowRightIcon,
  BookTextIcon,
  CheckIcon,
  ClipboardListIcon,
  FileTextIcon,
  HeadphonesIcon,
  MicIcon,
  NotepadTextIcon,
  PenIcon,
  RotateCcw,
  SheetIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const SKILL_ICONS: Record<string, typeof HeadphonesIcon> = {
  listening: HeadphonesIcon,
  reading: BookTextIcon,
  writing: PenIcon,
  speaking: MicIcon,
  grammar: SheetIcon,
  vocab: ClipboardListIcon,
};

const CardTestBank = ({
  mode,
  data,
  isDone,
  attempt,
}: {
  mode: string;
  data: PeriodicTest;
  isDone?: boolean;
  attempt?: PeriodicTestAttempt;
}) => {
  const router = useRouter();
  const [testInfos, setTestInfos] = useState<Test[]>([]);

  useEffect(() => {
    const fetchTestInfos = async () => {
      const ids = data.tests.map((t) => (typeof t === "string" ? t : t.id));
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/tests/${id}`).then((res) => res.json() as Promise<Test>),
        ),
      );
      setTestInfos(results);
    };
    fetchTestInfos();
  }, [data.tests]);

  const skillType = useMemo(() => {
    return (
      (data.tests[0] &&
        (typeof data.tests[0] === "string" ? "reading" : data.tests[0].type)) ||
      "reading"
    );
  }, [data.tests]);

  const testInfo = testInfos[0];

  const displayScore = useMemo(() => {
    const score = getPeriodicAttemptScore(attempt, data, testInfo);
    if (score === null || typeof score === "string") return score;
    return Number(score).toFixed(1);
  }, [attempt, data, testInfo]);

  const questionStats = useMemo(() => {
    if (data.tests.length > 1) return null;
    if (!testInfos.length) return null;
    if (skillType === "speaking") return null;

    let total = 0;

    if (skillType === "writing") {
      total = testInfos.length;
    } else {
      testInfos.forEach((test) => {
        if (test.type === "listening" || test.type === "reading") {
          const skillData = test[test.type] as any[];
          skillData?.forEach((item) => {
            item.sections?.forEach((s: any) => {
              s.content?.forEach((c: any) => {
                if (c.questions?.correctAnswers) {
                  total += Object.keys(c.questions.correctAnswers).length;
                } else if (Array.isArray(c.questions)) {
                  total += c.questions.length;
                }
              });
            });
          });
        } else if (test.type === "grammar" || test.type === "vocab") {
          const skillData = (test as any)[test.type];
          skillData?.sections?.forEach((s: any) => {
            total += s.questions?.length || 0;
          });
        }
      });
    }

    return { total, unit: skillType === "writing" ? "task" : "câu" };
  }, [testInfos, skillType]);

  const handleCheckResult = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (attempt?.id) {
      router.push(`/test-result?attemptId=${attempt.id}`);
    }
  };

  const skills = data.tests.map((test) =>
    typeof test === "string" ? "reading" : test.type,
  ) as any[];

  return (
    <Card
      className={cn(
        "min-w-[238px] bg-[rgba(168,171,178,0.1)] pt-4 px-3 pb-3 relative border-none flex flex-col justify-between",
        mode === "full" ? "h-full" : "h-fit",
      )}
    >
      <div>
        <div className="flex items-center gap-2 mb-2 pr-[44px]">
          <p className="font-semibold text-[16px] truncate">{data.title}</p>
          {isDone && (
            <div className="rounded-full bg-[#23BD33] h-[14px] w-[14px] flex items-center justify-center flex-shrink-0">
              <CheckIcon width={10} height={10} className="text-white" />
            </div>
          )}
        </div>

        <div className="absolute right-0 top-0 bg-white min-h-[42px] min-w-[42px] flex items-center justify-center text-[#E72929] rounded-bl-xl border-white border-4 gap-1 p-1">
          {data.tests.map((test) => {
            const Icon =
              typeof test === "string"
                ? SKILL_ICONS.reading
                : SKILL_ICONS[(test as any).type];
            return Icon ? (
              <Icon
                key={typeof test === "string" ? test : test.id}
                width={18}
                height={18}
              />
            ) : null;
          })}
        </div>

        <div className="mb-2">
          {questionStats && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[12px] text-[#6D737A] font-bold">
                <div className="flex items-center gap-1">
                  <NotepadTextIcon width={14} height={14} />
                  {questionStats.total} {questionStats.unit}
                </div>
                {attempt && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <SelectMode skills={skills} testId={data.id}>
                            <Button
                              size="icon"
                              className="h-6 w-6 bg-[#FD4444]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <RotateCcw width={14} height={14} />
                            </Button>
                          </SelectMode>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#151515] text-white border-none text-[12px]">
                        <p>Làm lại bài</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center bg-white rounded-[10px] h-[34px] pl-3">
        <div
          className={cn(
            "flex items-center gap-1 text-[12px] font-bold whitespace-nowrap",
            typeof displayScore === "string" && displayScore.includes("%")
              ? "text-[#23BD33]"
              : "text-[#6D737A]",
          )}
        >
          {displayScore !== null && (
            <>
              <FileTextIcon width={16} height={16} />
              {displayScore}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDone ? (
            <Button
              className="h-[34px] bg-[#FD4444] rounded-[10px] text-[12px]"
              onClick={handleCheckResult}
            >
              Xem lại bài
              <ArrowRightIcon width={14} height={14} />
            </Button>
          ) : (
            <SelectMode skills={skills} testId={data.id}>
              <Button className="h-[34px] bg-[#FD4444] rounded-[10px] text-[12px]">
                Làm bài
                <ArrowRightIcon width={14} height={14} />
              </Button>
            </SelectMode>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CardTestBank;
