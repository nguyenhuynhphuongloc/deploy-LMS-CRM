import type { FieldHook } from "payload";

export const beforeChangeBookingScheduleData: FieldHook = ({
  value,
  originalDoc,
}) => {
  const oldData = originalDoc?.schedule_data || {};
  const newData = value || {};

  if (!oldData || Object.keys(oldData).length === 0) return newData;

  const merged = { ...oldData };

  Object.keys(newData).forEach((weekKey) => {
    if (!merged[weekKey]) {
      merged[weekKey] = newData[weekKey];
    } else {
      const oldWeek = merged[weekKey];
      const newWeek = newData[weekKey];

      // Replace whole week if we trust the client to send the full week state
      // This is safer for ensuring deletions within a week are respected.
      merged[weekKey] = { ...oldWeek, ...newWeek };

      Object.keys(newWeek).forEach((dayKey) => {
        const newDay = newWeek[dayKey];
        // If it's a day object (not a string/number), replace it to ensure deletions persist
        if (newDay && typeof newDay === 'object' && !Array.isArray(newDay)) {
          merged[weekKey][dayKey] = newDay;
        }
      });
    }
  });

  return merged;
};
