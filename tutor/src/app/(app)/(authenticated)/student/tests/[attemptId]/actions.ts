"use server";

import configPromise from "@payload-config";
import { getPayload } from "payload";

import { cache } from "react";

const findPeriodicTestAttempt = cache(async (query: any) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.find({
    collection: "periodic_test_attempts",
    where: query,
    limit: 1,
    select: {
      id: true,
      createdAt: true,
    },
  });
});

const updatePeriodicTestAttempt = cache(async (id: string, data: any) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.update({
    collection: "periodic_test_attempts",
    id,
    data,
  });
});

const getPeriodicTestById = cache(async (id: string) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.findByID({
    collection: "periodic_tests",
    id,
    select: {
      id: true,
      createdAt: true,
    },
  });
});

const createPeriodicTestAttemptInternal = cache(async (data: any) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.create({
    collection: "periodic_test_attempts",
    data,
  });
});

export async function createPeriodicAttempt({
  type,
  userId,
  testId,
  mode = undefined,
  time,
  part,
  classId,
  session,
}: {
  type:
    | "homework"
    | "extra_homework"
    | "mini_test"
    | "mid_term"
    | "final_term"
    | "bank"
    | "entrance_test";
  userId: string;
  testId: string;
  mode?: "simulation" | "practice";
  time?: number;
  part?: string;
  classId?: string;
  session?: number;
}) {
  try {
    const query = {
      and: [
        { user: { equals: userId } },
        { type: { equals: type } },
        { test: { equals: testId } },
        classId ? { class: { equals: classId } } : {},
        session ? { session: { equals: session } } : {},
      ],
    };

    const { docs: pADocs, totalDocs: pATotalDocs } = await findPeriodicTestAttempt(query);

    if (pATotalDocs > 0) {
      await updatePeriodicTestAttempt(pADocs[0]!.id, {
        status: "in_progress",
        startedAt: new Date().toISOString(),
        statusDetails: {},
        mode,
        time,
        part,
      });

      return {
        success: true,
        message: "Periodic attempt updated",
        data: {
          id: pADocs[0]!.id,
        },
      };
    }

    const test = await getPeriodicTestById(testId);

    if (!test) {
      return {
        success: false,
        error_code: "no_periodic_test_found",
        message: "No Periodic Test found",
      };
    }

    const commonData = {
      type,
      user: userId,
      test: testId,
      class: classId,
      session,
      status: "in_progress" as const,
      startedAt: new Date().toISOString(),
    };

    const data =
      type === "bank"
        ? {
            ...commonData,
            mode,
            time,
            part,
          }
        : commonData;

    const { id } = await createPeriodicTestAttemptInternal(data);

    return {
      success: true,
      message: "Periodic attempt created",
      data: {
        id,
      },
    };
  } catch (e) {
    return {
      success: false,
      error_code: "internal_server_error",
      message: "An error occurred",
    };
  }
}
