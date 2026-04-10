"use server";

import type { PlacementSelectSchemaType } from "./schema";

import configPromise from "@payload-config";
import { random } from "lodash-es";
import { getPayload } from "payload";

import { cache } from "react";

const findPlacementAttempt = cache(async (leadId: string, type: string) => {
  const payload = await getPayload({ config: configPromise });
  const { docs, totalDocs } = await payload.find({
    collection: "placement_attempts",
    where: {
      and: [{ user: { equals: leadId } }, { type: { equals: type } }],
    },
    limit: 1,
    select: {
      id: true,
      status: true,
    },
  });
  return { docs, totalDocs };
});

const findPlacementTests = cache(async (type: string) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.find({
    collection: "placement_tests",
    where: {
      and: [
        {
          type: {
            equals: type,
          },
        },
        {
          _status: {
            equals: "published",
          },
        },
      ],
    },
  });
});

const updatePlacementAttempt = cache(async (id: string, testId: string) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.update({
    collection: "placement_attempts",
    id,
    data: {
      test: testId,
      status: "in_progress",
      startedAt: new Date().toISOString(),
      statusDetails: {
        currentSkill: 0,
        completionTimes: {
          listening: null,
          reading: null,
          writing: null,
          speaking: null,
        },
        timeLeft: {
          listening: null,
          reading: null,
          writing: null,
          speaking: null,
        },
      },
      answerSheet: {},
      completedAt: null,
    },
  });
});

const createPlacementAttemptInternal = cache(async (type: string, leadId: string, testId: string) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.create({
    collection: "placement_attempts",
    data: {
      type,
      user: leadId,
      test: testId,
      status: "in_progress",
      startedAt: new Date().toISOString(),
    },
  });
});

export async function createPlacementAttempt({
  type,
  leadId,
}: PlacementSelectSchemaType & {
  leadId: string;
}) {
  try {
    const { docs: pADocs, totalDocs: pATotalDocs } = await findPlacementAttempt(leadId, type);

    if (pATotalDocs > 0 && pADocs && pADocs[0] && pADocs[0].status === "in_progress") {
      return {
        success: true,
        message: "Placement attempt updated",
        data: {
          id: pADocs[0].id,
        },
      };
    }

    const { totalDocs: pTTotalDocs, docs: pTDocs } = await findPlacementTests(type);

    if (pTTotalDocs === 0 || !pTDocs) {
      return {
        success: false,
        error_code: "no_placement_tests_found",
        message: "No placement tests found",
      };
    }
    const testId = pTDocs[random(pTTotalDocs - 1)]?.id;

    if (pATotalDocs > 0 && pADocs && pADocs[0]) {
      // Case: status is 'completed' or other (since 'in_progress' was handled above)
      // We override/reset the existing record
      await updatePlacementAttempt(pADocs[0].id, testId!);

      return {
        success: true,
        message: "Placement attempt reset",
        data: {
          id: pADocs[0].id,
        },
      };
    }

    const { id } = await createPlacementAttemptInternal(type, leadId, testId!);

    return {
      success: true,
      message: "Placement attempt created",
      data: {
        id,
      },
    };
  } catch {
    return {
      success: false,
      error_code: "internal_server_error",
      message: "An error occurred",
    };
  }
}
