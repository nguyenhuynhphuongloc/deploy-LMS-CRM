"use client";

import { useStore } from "@/zustand/placement-test/provider";
import { useEffect, useRef } from "react";
import { saveProgress } from "@/app/(app)/(unauthenticated)/placement-tests/[leadId]/mini/[testId]/actions";

const AUTO_SAVE_INTERVAL = 3 * 60 * 1000; // 3 phút = 180,000ms

interface UseMiniAutoSaveProps {
  leadId: string;
  testId: string;
  enabled?: boolean;
}

export function useMiniAutoSave({
  leadId,
  testId,
  enabled = true,
}: UseMiniAutoSaveProps) {
  const answerSheet = useStore((s) => s.answerSheet);
  const timeLeft = useStore((s) => s.navigation.timeLeft);

  const dataRef = useRef({ answerSheet, timeLeft });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref khi data thay đổi
  useEffect(() => {
    dataRef.current = { answerSheet, timeLeft };
  }, [answerSheet, timeLeft]);

  useEffect(() => {
    if (!enabled || !leadId || !testId) {
      return;
    }

    const doAutoSave = async () => {
      const { answerSheet: curAnswers, timeLeft: curTime } = dataRef.current;

      try {
        if (typeof curTime !== "number" || isNaN(curTime)) {
          console.warn("[MINI-AUTO-SAVE] Skipping save: timeLeft is not a number", curTime);
          return;
        }

        console.log("[MINI-AUTO-SAVE] Triggering backup:", {
          testId,
          curTime,
          timestamp: new Date().toISOString(),
        });

        const result = await saveProgress({
          leadId,
          testId,
          answerSheet: curAnswers,
          timeLeft: curTime,
        });

        if (result.success) {
          console.log("[MINI-AUTO-SAVE] Progress saved successfully");
        } else {
          console.error("[MINI-AUTO-SAVE] Progress save failed:", result.error);
        }
      } catch (error) {
        console.error("[MINI-AUTO-SAVE] Error during auto-save:", error);
      }
    };

    // Set interval để auto-save mỗi 3 phút
    intervalRef.current = setInterval(doAutoSave, AUTO_SAVE_INTERVAL);

    console.log("[MINI-AUTO-SAVE] Started auto-save interval (every 3 minutes)");

    // Cleanup khi unmount hoặc disable
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("[MINI-AUTO-SAVE] Stopped auto-save interval");
      }
    };
  }, [enabled, leadId, testId]);
}
