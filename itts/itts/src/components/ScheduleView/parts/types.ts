export interface SlotData {
  registered: boolean;
  type?: "student" | "work";
  workType?: "marketing" | "off" | "meeting";
  studentId?: string;
  studentName?: string;
  className?: string;
  skill?: string;
  testType?: string;
  testDescription?: string;
  partTest?: string;
  isCompleted?: boolean;
  attendance?: "present" | "absent" | "absent_with_permission";
  score?: string;
  s1?: number;
  s2?: number;
  s3?: number;
  s4?: number;
  overall?: string;
  wowComment?: string;
  wowNote?: string;
  meetingLink?: string;
  meetingType?: string;
}

export interface DayData {
  date: string;
  wows: string[];
  wowBranches?: string[];
  wowsAfternoon?: string[];
  wowBranchesAfternoon?: string[];
  wowsEvening?: string[];
  wowBranchesEvening?: string[];
  slots: Record<string, SlotData>;
}

export type WeekData = Record<string, DayData>;
export type ScheduleData = Record<string, WeekData>;

export interface ModalState {
  open: boolean;
  dayKey: string;
  slotKey: string;
  shift?: "morning" | "afternoon" | "evening";
}

export interface WowModalState {
  open: boolean;
  dayKey: string;
  wowIndex?: number;
  shift?: "morning" | "afternoon" | "evening";
}

export interface WowAdmin {
  id: string;
  fullName?: string;
  role?: string;
  meetingLink?: string;
}

export interface DraggedSlot {
  dayKey: string;
  slotKey: string;
  data: SlotData;
}
