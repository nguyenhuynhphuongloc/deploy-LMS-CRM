import type { CollectionAfterChangeHook } from "payload";

export const afterChangeAttendanceRecord: CollectionAfterChangeHook = async ({
  req,
  doc,
  operation,
}) => {
  const payload = req.payload;

  if (operation === "create" || operation === "update") {
    const violationData = (doc as any).ViolationRecord_data;
    if (!violationData) return;

    const studentIds = new Set<string>();
    Object.values(violationData).forEach((session: any) => {
      if (session?.students) {
        Object.keys(session.students).forEach((id) => studentIds.add(id));
      }
    });

    if (studentIds.size === 0) return;

    const { checkAndSendViolationWarning } = await import(
      "@/payload/utilities/studentViolation"
    );

    await Promise.allSettled(
      Array.from(studentIds).map(async (studentId) => {
        await checkAndSendViolationWarning(payload, studentId, req);
      }),
    );
  }

  return doc;
};
