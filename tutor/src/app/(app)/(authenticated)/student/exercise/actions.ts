"use server";

import configPromise from "@payload-config";
import { getPayload } from "payload";

import { cache } from "react";

const findFeedback = cache(async (classId: string) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.find({
    collection: "feedback",
    where: {
      class: { equals: classId },
    },
    limit: 1,
  });
});

const updateFeedback = cache(async (id: string, data: any) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.update({
    collection: "feedback",
    id,
    data,
  });
});

const createFeedbackInternal = cache(async (data: any) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.create({
    collection: "feedback",
    data,
  });
});

export async function checkSessionFeedback({
  userId,
  classId,
  session,
}: {
  userId: string;
  classId: string;
  session: number;
}) {
  try {
    const { docs } = await findFeedback(classId);

    if (docs.length === 0) return false;

    const feedback = docs[0]!;
    const studentReviewSession = feedback.student_review_session as any;

    if (
      studentReviewSession &&
      studentReviewSession[userId] &&
      studentReviewSession[userId][session]
    ) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking session feedback:", error);
    return false;
  }
}

export async function createSessionFeedback({
  userId,
  classId,
  session,
  feedbackData,
}: {
  userId: string;
  classId: string;
  session: number;
  feedbackData: any;
}) {
  try {
    const { docs } = await findFeedback(classId);

    const existing = docs[0];
    if (existing) {
      const currentReviews = (existing.student_review_session as any) || {};
      const oldStudentReviews = currentReviews[userId] || {};

      // Migrate logic: Nếu dữ liệu cũ có field 'session' trực tiếp, bọc nó vào session key tương ứng
      const studentReviews =
        oldStudentReviews.session != null &&
        typeof oldStudentReviews.session === "number"
          ? { [oldStudentReviews.session]: oldStudentReviews }
          : oldStudentReviews;

      await updateFeedback(existing.id, {
        student_review_session: {
          ...currentReviews,
          [userId]: {
            ...studentReviews,
            [session]: {
              ...feedbackData,
              session,
            },
          },
        },
      });
    } else {
      await createFeedbackInternal({
        class: classId,
        student_review_session: {
          [userId]: {
            [session]: {
              ...feedbackData,
              session,
            },
          },
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating session feedback:", error);
    return { success: false, message: "Internal server error" };
  }
}
