import type { PlacementAttempt, Test } from "@/payload-types";
import type { MultipleChoiceBlock, ProgressItem } from "./types";

import configPromise from "@payload-config";
import { notFound, redirect } from "next/navigation";
import { getPayload, type Payload } from "payload";
import { cache } from "react";

import { StoreProvider } from "@/zustand/placement-test/provider";
import Root from "./root";
import { add, differenceInSeconds } from "date-fns";

const verifyPlacementAttempt = cache(
  async (
    { leadId, testId }: { leadId: string; testId: string },
    payload: Payload,
  ) => {
    const { docs, totalDocs } = await payload.find({
      collection: "placement_attempts",
      where: {
        user: { equals: leadId },
        id: { equals: testId },
        status: { not_equals: "completed" },
      },
      limit: 1,
    });

    if (totalDocs === 0) {
      return undefined;
    }

    return docs[0];
  },
);

const getTests = cache(async ({ id }: { id: string }, payload: Payload) => {
  const { tests } = (await payload.findByID({
    collection: "placement_tests",
    id,
    select: {
      tests: true,
    },
    depth: 0,
  })) as { tests: string[] };

  const data = await Promise.all(
    tests.map((id) =>
      payload.findByID({
        collection: "tests",
        id,
      }),
    ),
  );

  return data;
});

export default async function Page({
  params,
}: {
  params: Promise<{ leadId: string; testId: string }>;
}) {
  let attempt: PlacementAttempt | undefined;
  let tests: Test[];
  let progress: Array<ProgressItem>;
  let error: string | null = null;

  try {
    const { leadId, testId } = await params;
    const payload = await getPayload({ config: configPromise });
    attempt = await verifyPlacementAttempt({ leadId, testId }, payload);

    if (!attempt) {
      return redirect("/placement-tests");
    }

    tests = await getTests({ id: attempt.test as string }, payload);

    progress = tests.reduce<Array<ProgressItem>>((progress, entry) => {
      switch (entry.type) {
        case "grammar":
          progress.push({
            type: entry.type,
            content: (entry.grammar?.sections ?? []) as MultipleChoiceBlock[],
          });
          break;
        case "vocab":
          progress.push({
            type: entry.type,
            content: (entry.vocab?.sections ?? []) as MultipleChoiceBlock[],
          });
          break;
        case "reading":
          progress.push({
            type: entry.type,
            content: (entry.reading?.[0]?.sections?.[0]?.content ??
              []) as MultipleChoiceBlock[],
          });
          break;
        case "writing":
          progress.push({
            type: entry.type,
            content: [
              {
                id: entry.writing?.[0]?.id ?? "",
                questions:
                  entry.writing?.map((task) => ({ id: task.id ?? "" })) ?? [],
              },
            ],
          });
          break;
        case "speaking":
          progress.push({
            type: entry.type,
            content: (entry.speaking?.[0] as any)?.questions ?? [],
          });
          break;
      }
      return progress;
    }, []);
  } catch {
    error = "An error occurred while fetching data";
  }

  if (error) {
    return notFound();
  }

  const statusDetails = (attempt as any)?.statusDetails || {};
  const startedAt = attempt!.startedAt!;
  const type = (attempt as any).type;

  const initTime = differenceInSeconds(
    add(new Date(startedAt), {
      minutes: type === "mini" ? 30 : 200,
      seconds: 1,
    }),
    new Date(),
  );

  const dbTimeLeft = statusDetails.timeLeft;
  const timeLeft =
    typeof dbTimeLeft === "number" ? dbTimeLeft : initTime > 0 ? initTime : 0;

  return (
    <StoreProvider
      initialState={{
        answerSheet: (attempt as any)?.answerSheet || {},
        navigation: {
          timeLeft: timeLeft,
          currentSkill: statusDetails.currentSkill || 0,
          currentSection: 0,
        },
      }}
    >
      <Root attempt={attempt!} tests={tests!} progress={progress!} />
    </StoreProvider>
  );
}
