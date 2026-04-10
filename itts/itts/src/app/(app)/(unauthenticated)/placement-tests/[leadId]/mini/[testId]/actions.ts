"use server";

import configPromise from "@payload-config";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { cache } from "react";

const getAttemptDetails = cache(async (testId: string) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.findByID({
    collection: "placement_attempts",
    id: testId,
    select: {
      statusDetails: true,
    },
  });
});

const updatePlacementAttemptInternal = cache(
  async (testId: string, leadId: string, data: any) => {
    const payload = await getPayload({ config: configPromise });
    return await payload.update({
      collection: "placement_attempts",
      where: {
        id: { equals: testId },
        user: { equals: leadId },
      },
      data,
    });
  },
);

export async function onSave({
  leadId,
  testId,
  answerSheet,
}: {
  leadId: string;
  testId: string;
  answerSheet: Record<string, any>;
}) {
  await updatePlacementAttemptInternal(testId, leadId, {
    answerSheet,
    status: "completed",
    completedAt: new Date().toISOString(),
  });

  redirect(`/placement-tests/${leadId}/done`);
}

export async function saveProgress({
  leadId,
  testId,
  answerSheet,
  timeLeft,
}: {
  leadId: string;
  testId: string;
  answerSheet: Record<string, any>;
  timeLeft: number;
}) {
  try {
    const attempt = await getAttemptDetails(testId);
    const statusDetails = (attempt?.statusDetails as any) || {};

    await updatePlacementAttemptInternal(testId, leadId, {
      answerSheet,
      status: "in_progress",
      statusDetails: {
        ...statusDetails,
        timeLeft,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MINI-AUTO-SAVE] Error saving progress:", error);
    return { success: false, error: String(error) };
  }
}
