export const VIOLATION_RULES = {
  no_camera: 4,
  absent_without_permission: 3,
  late_homework: 5,
} as const;

export type ViolationType = keyof typeof VIOLATION_RULES;

export const VIOLATION_LABELS: Record<ViolationType, string> = {
  no_camera: "Không mở cam",
  absent_without_permission: "Vắng không phép",
  late_homework: "Không làm bài tập",
};
