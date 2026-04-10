import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Class } from "@/payload-types";
import { format } from "date-fns";
import { CalendarDaysIcon, LockKeyholeIcon } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";

interface SessionNavigatorProps {
  session: number;
  classes: Class;
  sessionInfo: any;
  learnedSession: number;
  attendanceData: any;
  userId: string;
  onSessionChange: (index: number) => void;
  recordingLink?: string | null;
}

export const SessionNavigator = ({
  session,
  classes,
  sessionInfo,
  learnedSession,
  attendanceData,
  userId,
  onSessionChange,
  recordingLink,
}: SessionNavigatorProps) => {
  const sessionMilestones = useMemo(() => {
    let cumulative = 0;
    return (classes.sessions || []).map((s) => {
      const d = Number((s as any).duration) || 0;
      const prev = cumulative;
      cumulative += d;
      if (classes.type_class === "one_to_one") {
        const milestone = Math.floor(cumulative / 24);
        const prevMilestone = Math.floor(prev / 24);
        return milestone > prevMilestone ? milestone : 0;
      }
      return 0;
    });
  }, [classes.sessions, classes.type_class]);

  if (!session || !classes) return null;

  return (
    <div className="p-2 sm:p-4 md:p-6 text-center mt-[60px] w-full border-[#E7EAE9] border rounded-[18px]">
      <div>
        <p className="text-[32px] font-bold">Buổi {session}</p>
        <div className="text-[18px] text-[#151515] flex items-center w-full justify-center">
          <div className="flex items-center justify-center gap-2 flex-1">
            <CalendarDaysIcon className="text-[#6D737A]" />
            {sessionInfo?.date &&
              format(new Date(sessionInfo.date), "dd/MM/yyyy HH:mm a")}
          </div>
          {recordingLink && (
            <a
              href={recordingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="justify-center flex-1 flex items-center gap-2 font-italic italic text-blue-600 cursor-pointer hover:underline hover:text-blue-700 transition"
            >
              <Image
                width={24}
                height={24}
                alt="monitor"
                src="/monitor-recorder.svg"
              />
              Link Recording
            </a>
          )}
          {(() => {
            const status = attendanceData?.[sessionInfo?.id]?.[userId]?.status;
            const sessionDate = sessionInfo?.date
              ? new Date(sessionInfo.date)
              : null;
            const isFuture = sessionDate && sessionDate > new Date();

            if (!status && isFuture) {
              return null;
            }

            return (
              <div className="justify-center flex-1 flex items-center gap-2">
                <Image
                  width={24}
                  height={24}
                  alt="status-up"
                  src="/status-up.svg"
                  quality={100}
                />
                {(() => {
                  switch (status) {
                    case "absent":
                      return (
                        <span className="text-[#E72929] font-bold">Vắng</span>
                      );
                    case "leave":
                      return (
                        <span className="text-[#A8ABB2] font-bold">
                          Xin nghỉ
                        </span>
                      );
                    case "late":
                      return (
                        <span className="text-[#FBA631] font-bold">Muộn</span>
                      );
                    case "on_time":
                      return (
                        <span className="text-[#23BD33] font-bold">
                          Đúng giờ
                        </span>
                      );
                    default:
                      return "Giáo viên chưa điểm danh";
                  }
                })()}
              </div>
            );
          })()}
        </div>
      </div>
      <TooltipProvider>
        <div className="py-3 mt-8 w-full rounded-[16px] border-dashed grid grid-cols-[repeat(15,_minmax(0,_1fr))] justify-items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 ">
          {classes.sessions?.map((s, index) => {
            console.log(s);
            const milestoneN = sessionMilestones?.[index] || 0;
            const isTest = milestoneN > 0;
            const isMidTerm =
              classes.type_class !== "one_to_one" &&
              index === (classes.sessions?.length || 0) / 2 - 1;

            const isFinal = index === classes.sessions!.length - 1;
            const isLocked = learnedSession < index + 1;
            const isActive = session === index + 1;

            const sessionStatus =
              attendanceData?.[(s as any)?.id]?.[userId]?.status;

            const statusLabels: Record<string, string> = {
              on_time: "Đúng giờ",
              late: "Muộn",
              leave: "Xin nghỉ",
              absent: "Vắng",
            };

            const statusLabel = statusLabels[sessionStatus] || "Chưa điểm danh";

            return (
              <Tooltip key={index} delayDuration={300}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "hover:shadow-md transition text-[#6D737A] text-[14px] w-10 h-10 flex items-center justify-center border border-[#E7EAE9] rounded-full bg-[#f8f8f8] cursor-pointer font-bold",
                      "hover:scale-105 hover:brightness-105 active:scale-95 active:brightness-95",
                      isActive && "scale-105",

                      // Trạng thái: Đúng giờ
                      sessionStatus === "on_time" &&
                        "border-[#23BD33]/35 bg-[#23BD33]/15 text-[#23BD33]",
                      isActive &&
                        sessionStatus === "on_time" &&
                        "shadow-[0_0_10px_rgba(35,189,51,0.25)] border-[#23BD33]/60",

                      // Trạng thái: Muộn
                      sessionStatus === "late" &&
                        "border-[#FBA631]/35 bg-[#FBA631]/15 text-[#FBA631]",
                      isActive &&
                        sessionStatus === "late" &&
                        "shadow-[0_0_10px_rgba(251,166,49,0.25)] border-[#FBA631]/60",

                      // Trạng thái: Vắng & Xin nghỉ
                      sessionStatus === "absent" &&
                        "bg-[#E72929] text-white border-[#E72929] shadow-none",
                      sessionStatus === "leave" &&
                        "bg-[#A8ABB2] text-white border-[#A8ABB2] shadow-none",

                      // Mặc định cho Active khi chưa có điểm danh
                      isActive &&
                        !sessionStatus &&
                        "border-[rgba(231,41,41,0.35)] bg-[rgba(231,41,41,0.15)] text-[#E72929] shadow-[0_0_10px_rgba(231,41,41,0.25)]",
                      (isMidTerm || isTest || isFinal) &&
                        !sessionStatus &&
                        "text-[#E72929] bg-[rgba(231,41,41,0.1)] border-[rgba(231,41,41,0.2)]",

                      (isLocked || isActive) &&
                        "pointer-events-none active:scale-100 active:brightness-100",
                    )}
                    onClick={() => onSessionChange(index + 1)}
                  >
                    {isLocked ? (
                      <LockKeyholeIcon width={18} height={18} />
                    ) : isMidTerm || isTest || isFinal ? (
                      <span className="text-[10px]">
                        {isMidTerm ? "Mid term" : isTest ? "Test" : "Final"}
                      </span>
                    ) : (
                      index + 1
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{statusLabel}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
};
