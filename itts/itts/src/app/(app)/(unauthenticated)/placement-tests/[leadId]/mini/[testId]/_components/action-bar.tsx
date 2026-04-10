"use client";

import { cn } from "@/lib/utils";
import { useStore } from "@/zustand/placement-test/provider";
import Image from "next/image";
import { useEffect } from "react";
import type { ProgressItem } from "../types";
import CountdownTimer from "./countdown-timer";
import { ReviewAnswer } from "./review-answer";

export default function ActionBar({
  data,
  isTourCompleted,
}: {
  data: Array<ProgressItem>;
  isTourCompleted: boolean;
}) {
  const timeLeft = useStore((s) => s.navigation.timeLeft);
  const decreaseTimeLeft = useStore((s) => s.decreaseTimeLeft);

  useEffect(() => {
    if (timeLeft <= 0) return;
    if (!isTourCompleted) return;

    const interval = setInterval(() => {
      decreaseTimeLeft();
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, isTourCompleted, decreaseTimeLeft]);

  return (
    <header
      className={cn(
        "fixed left-0 top-0 z-10 h-[80px] w-full bg-white shadow-[0px_0px_60px_0px_rgba(0,0,0,0.05)]",
      )}
    >
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6 py-4">
        <div className="flex-1">
          <Image src="/logo.png" width={94} height={49} alt="logo" />
        </div>
        <CountdownTimer timeLeft={timeLeft} />
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* <Button variant="ghost" size="icon">
            <Image
              src="/icons/task-square.svg"
              width={24}
              height={24}
              alt="task-square"
            />
          </Button> */}
          {/* <Button variant="ghost" size="icon">
            <Image
              src="/icons/light-bulb.svg"
              width={24}
              height={24}
              alt="light-bulb"
            />
          </Button>
          <Button variant="ghost" size="icon">
            <Image src="/icons/note.svg" width={24} height={24} alt="note" />
          </Button> */}
          <ReviewAnswer timeLeft={timeLeft} data={data} />
        </div>
      </div>
    </header>
  );
}
