import type { CollectionAfterChangeHook } from "payload";

export const afterChangeBookingSchedule: CollectionAfterChangeHook = ({
  doc,
  operation,
}) => {
  const isUpdate = operation === "update" || operation === "create";

  if (isUpdate) {
    console.log(
      `[Event] Đang phát tín hiệu cập nhật cho lịch học (ID: ${doc.id})`,
    );

    import("@/lib/events")
      .then(({ scheduleEventEmitter }) => {
        scheduleEventEmitter.emit("schedule_updated", {
          id: doc.id,
          updatedAt: new Date().toISOString(),
          operation: "update",
        });
      })
      .catch((err) => {
        console.error("[Event] Lỗi khi phát tín hiệu SSE:", err);
      });
  }

  return doc;
};
