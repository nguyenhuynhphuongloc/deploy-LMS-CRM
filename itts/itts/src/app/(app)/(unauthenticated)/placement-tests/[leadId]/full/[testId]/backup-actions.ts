"use server";

import configPromise from "@payload-config";
import { getPayload } from "payload";
import { onSave } from "./actions";
import { isAnswerSheetEmpty } from "@/lib/utils";

import { cache } from "react";

const getPlacementAttempt = cache(async (id: string) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.findByID({
    collection: "placement_attempts",
    id,
    select: {
      statusDetails: true,
    },
  });
});

const createTestBackup = cache(async (data: any) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.create({
    collection: "test_backups",
    data,
  });
});

export async function saveTestBackup({
  leadId,
  testId,
  answerSheet,
  currentSkill,
  timeLeft,
}: {
  leadId: string;
  testId: string;
  answerSheet: Record<string, any>;
  currentSkill: number;
  timeLeft: number;
}) {
  try {
    if (isAnswerSheetEmpty(answerSheet)) {
      console.warn("[BACKUP] Skipping backup: answerSheet is empty.");
      return { success: false, error: "Empty answerSheet" };
    }

    // 1. Backup vào PlacementAttempts (overwrite)
    await onSave({
      leadId,
      testId,
      answerSheet,
      currentSkill,
      timeLeft,
      isBackup: true,
    });

    // 2. Lấy statusDetails từ PlacementAttempts
    const attempt = await getPlacementAttempt(testId);
    const statusDetails = attempt?.statusDetails;

    // 3. Tạo backup record mới vào TestBackups
    await createTestBackup({
      placementAttempt: testId,
      answerSheet,
      statusDetails,
      type: "placement",
    });

    return { success: true };
  } catch (error) {
    console.error("[BACKUP] Error saving backup:", error);
    return { success: false, error: String(error) };
  }
}
