import type { Access } from "payload";
import { ROLES } from "./index";

/**
 * Giới hạn quyền xem và sửa PeriodicTestAttempts cho Teacher.
 * Giáo viên chỉ được xem và sửa các bài thi thuộc lớp học mà họ phụ trách.
 */
export const periodicTestAttemptsAccess: Access = async ({ req: { user } }) => {
  if (!user) return false;

  // Admin có toàn quyền
  if (user.role === ROLES.ADMIN) return true;

  // Nếu là giáo viên, giới hạn bài thi thuộc lớp mình phụ trách
  if (
    user.role === ROLES.TEACHER_FULL_TIME ||
    user.role === ROLES.TEACHER_PART_TIME
  ) {
    return {
      "class.teachers.teacher": {
        equals: user.id,
      },
    };
  }

  // Các role khác sẽ theo logic phân quyền chung (getPermissions)
  // Logic này sẽ được kết hợp trong collection config
  return true;
};
