export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 21; h++) {
    const hh = String(h).padStart(2, "0");
    const hh1 = String(h + 1).padStart(2, "0");

    const s1 = `${hh}:00-${hh}:30`;
    const s2 = `${hh}:30-${hh1}:00`;

    if (h === 21) {
      slots.push(s1);
      break;
    }
    slots.push(s1);
    slots.push(s2);
  }
  return slots;
}

export const TIME_SLOTS = generateTimeSlots();

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getDayOfWeek(monday: Date, index: number): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + index);
  return d;
}
