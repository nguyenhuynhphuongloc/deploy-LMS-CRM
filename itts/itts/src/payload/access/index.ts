import type { Access, AccessArgs, Where } from "payload";

import type { User } from "@/payload-types";

type isAuthenticated = (args: AccessArgs<User>) => boolean;

export const authenticated: isAuthenticated = ({ req: { user } }) => {
  return Boolean(user);
};

export const isAdmin: Access = ({ req: { user } }) => user?.role === "admin";

export const ROLES = {
  ADMIN: "admin",
  HOC_VU_MANAGER: "hoc_vu_manager",
  HOC_VU_EXECUTIVE: "hoc_vu_executive",
  ACADEMIC_MANAGER: "academic_manager",
  ACADEMIC_EXECUTIVE: "academic_executive",
  TEACHER_PART_TIME: "teacher_part_time",
  TEACHER_FULL_TIME: "teacher_full_time",
  WOW_MANAGER: "wow_manager",
  WOW_EXECUTIVE: "wow_executive",
  SALE_MANAGER: "sale_manager",
  SALE_EXECUTIVE: "sale_executive",
  MARKETING_MANAGER: "marketing_manager",
  MARKETING_EXECUTIVE: "marketing_executive",
  DESIGNER: "designer",
  SEO: "seo",
  DIGITAL_MARKETING: "digital_marketing",
  HR_MANAGER: "hr_manager",
  HR_GENERALIST: "hr_generalist",
  KE_TOAN: "ke_toan",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_OPTIONS = [
  { label: "CEO", value: ROLES.ADMIN },
  { label: "Học vụ Manager", value: ROLES.HOC_VU_MANAGER },
  { label: "Học vụ Executive", value: ROLES.HOC_VU_EXECUTIVE },
  { label: "Academic Manager", value: ROLES.ACADEMIC_MANAGER },
  { label: "Academic Executive", value: ROLES.ACADEMIC_EXECUTIVE },
  { label: "Teacher Part-Time", value: ROLES.TEACHER_PART_TIME },
  { label: "Teacher Full-Time", value: ROLES.TEACHER_FULL_TIME },
  { label: "WOW Manager", value: ROLES.WOW_MANAGER },
  { label: "WOW Executive", value: ROLES.WOW_EXECUTIVE },
  { label: "Sale Manager", value: ROLES.SALE_MANAGER },
  { label: "Sale Executive", value: ROLES.SALE_EXECUTIVE },
  { label: "Marketing Manager", value: ROLES.MARKETING_MANAGER },
  { label: "Marketing Executive", value: ROLES.MARKETING_EXECUTIVE },
  { label: "Designer", value: ROLES.DESIGNER },
  { label: "SEO", value: ROLES.SEO },
  { label: "Digital Marketing", value: ROLES.DIGITAL_MARKETING },
  { label: "HR Manager", value: ROLES.HR_MANAGER },
  { label: "HR Generalist", value: ROLES.HR_GENERALIST },
  { label: "Kế toán", value: ROLES.KE_TOAN },
];

export const DEPARTMENT_OPTIONS = [
  { label: "Admin", value: "ceo" },
  { label: "Học vụ", value: "hoc_vu" },
  { label: "Học thuật", value: "hoc_thuat" },
  { label: "Sale", value: "sale" },
  { label: "Marketing", value: "marketing" },
  { label: "HR", value: "hr" },
  { label: "Kế toán", value: "ke_toan" },
  { label: "Legacy (25)", value: "25" },
];

export const DEPARTMENT_ROLES: Record<string, Role[]> = {
  ceo: [ROLES.ADMIN],
  hoc_vu: [ROLES.HOC_VU_MANAGER, ROLES.HOC_VU_EXECUTIVE],
  hoc_thuat: [
    ROLES.ACADEMIC_MANAGER,
    ROLES.ACADEMIC_EXECUTIVE,
    ROLES.TEACHER_PART_TIME,
    ROLES.TEACHER_FULL_TIME,
    ROLES.WOW_MANAGER,
    ROLES.WOW_EXECUTIVE,
  ],
  sale: [ROLES.SALE_MANAGER, ROLES.SALE_EXECUTIVE],
  marketing: [
    ROLES.MARKETING_MANAGER,
    ROLES.MARKETING_EXECUTIVE,
    ROLES.DESIGNER,
    ROLES.SEO,
    ROLES.DIGITAL_MARKETING,
  ],
  hr: [ROLES.HR_MANAGER, ROLES.HR_GENERALIST],
  ke_toan: [ROLES.KE_TOAN],
};

export const isPermission =
  (allowedRoles: Role[]): Access =>
  ({ req: { user } }) => {
    if (!user) return false;
    if (user?.role === ROLES.ADMIN) return true;
    return user?.role ? allowedRoles.includes(user.role as Role) : false;
  };

export const hasAnyPermission = (permissions: {
  create?: Role[];
  read?: Role[];
  update?: Role[];
  delete?: Role[];
}) => {
  const access: any = {};
  if (permissions.create) access.create = isPermission(permissions.create);
  if (permissions.read) access.read = isPermission(permissions.read);
  if (permissions.update) access.update = isPermission(permissions.update);
  if (permissions.delete) access.delete = isPermission(permissions.delete);
  return access;
};

export const isAdminOrCreatedBy: Access = ({ req: { user } }) => {
  if (user?.role === "admin") {
    return true;
  }

  if (user) {
    return {
      createdBy: {
        equals: user.id,
      },
    };
  }

  return false;
};

export const published: Access = ({ req: { user } }) => {
  if (Boolean(user)) return true;

  return {
    _status: {
      equals: "published",
    },
  };
};

// --- Dynamic Role Permission từ collection role_permissions ---

type PermAction = "view" | "create" | "update" | "delete";
type PermissionData = Record<
  string,
  Record<string, Record<PermAction, boolean>>
>;

// Cache để tránh query DB mỗi request
let permissionCache: PermissionData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 giây

export async function getPermissions(
  payload: any,
): Promise<PermissionData | null> {
  const now = Date.now();
  if (permissionCache && now - cacheTimestamp < CACHE_TTL) {
    return permissionCache;
  }

  try {
    const res = await payload.find({
      collection: "role_permissions",
      limit: 1,
    });

    if (res.docs && res.docs.length > 0) {
      permissionCache = res.docs[0].permissions as PermissionData;
      cacheTimestamp = now;
      return permissionCache;
    }
  } catch (e) {
    console.error("Lỗi tải cấu hình quyền:", e);
  }

  return null;
}

/**
 * Tạo access config cho 1 collection dựa trên dữ liệu từ role_permissions.
 * Admin luôn có full quyền. Nếu chưa có cấu hình thì mặc định cho phép tất cả.
 *
 * @param collectionSlug - slug của collection cần check quyền
 *
 * @example
 * // Trong collection config:
 * access: checkRolePermission("courses"),
 */
export const checkRolePermission = (collectionSlug: string) => {
  const makeAccess = (action: PermAction): Access => {
    return async ({ req: { user, payload } }) => {
      if (!user) return false;

      if ((user as any).collection === "users") return true;

      if ((user as any).role === ROLES.ADMIN) return true;

      if (action === "view") {
        // Teacher được phép xem Leads và Users
        if (
          (collectionSlug === "leads" || collectionSlug === "users") &&
          (user.role === ROLES.TEACHER_FULL_TIME ||
            user.role === ROLES.TEACHER_PART_TIME)
        ) {
          return true;
        }

        // Giáo viên chỉ thấy lớp mình dạy, điểm danh và feedback của lớp mình dạy
        if (
          user.role === ROLES.TEACHER_FULL_TIME ||
          user.role === ROLES.TEACHER_PART_TIME
        ) {
          if (collectionSlug === "classes") {
            return {
              "sessions.teacher": {
                equals: user.id,
              },
            } as Where;
          }
          if (collectionSlug === "feedback") {
            return {
              "class.teachers.teacher": {
                equals: user.id,
              },
            } as Where;
          }

          if (
            collectionSlug === "attendanceRecords" ||
            collectionSlug === "homework-assignments"
          ) {
            return {
              "class.sessions.teacher": {
                equals: user.id,
              },
            } as Where;
          }
        }

        // Luôn cho phép xem Branches, Rooms, Band Score cho tất cả roles (để dùng trong UI quan hệ)
        if (
          collectionSlug === "branches" ||
          collectionSlug === "rooms" ||
          collectionSlug === "band_score"
        ) {
          return true;
        }
      }

      // Luôn cho phép nhân viên xem/sửa chính mình
      if (
        (action === "view" || action === "update") &&
        collectionSlug === "admins"
      ) {
        // Cho phép quản lý và nhân viên WOW/Giáo viên xem danh sách giáo viên để hiện tên trên lịch
        if (
          action === "view" &&
          (user.role === ROLES.WOW_MANAGER ||
            user.role === ROLES.WOW_EXECUTIVE ||
            user.role === ROLES.TEACHER_FULL_TIME ||
            user.role === ROLES.TEACHER_PART_TIME)
        ) {
          return {
            or: [
              {
                id: {
                  equals: user.id,
                },
              },
              {
                department: {
                  equals: "hoc_thuat",
                },
              },
            ],
          } as Where;
        }

        if (
          action === "view" &&
          [
            ROLES.HOC_VU_MANAGER,
            ROLES.HOC_VU_EXECUTIVE,
            ROLES.ACADEMIC_MANAGER,
            ROLES.ACADEMIC_EXECUTIVE,
            ROLES.WOW_MANAGER,
            ROLES.WOW_EXECUTIVE,
          ].includes(user.role as Role)
        ) {
          return {
            or: [
              {
                id: {
                  equals: user.id,
                },
              },
              {
                department: {
                  equals: "hoc_thuat",
                },
              },
            ],
          } as Where;
        }

        return {
          id: {
            equals: user.id,
          },
        } as Where;
      }

      const perms = await getPermissions(payload);
      if (!perms) return true;

      const rolePerms = perms[user.role as string];
      if (!rolePerms) return true;

      const colPerms = rolePerms[collectionSlug];
      if (!colPerms) return true;

      const hasPerm = colPerms[action] ?? true;
      if (hasPerm === false) return false;

      return hasPerm;
    };
  };

  return {
    read: makeAccess("view"),
    create: makeAccess("create"),
    update: makeAccess("update"),
    delete: makeAccess("delete"),
  };
};

export const isNotTeacher = ({ req: { user } }: any) => {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  return (
    user.role !== ROLES.TEACHER_FULL_TIME &&
    user.role !== ROLES.TEACHER_PART_TIME
  );
};

/**
 * Ẩn collection khỏi sidebar dựa trên role của user.
 * Admin luôn thấy. Giáo viên (Full-time/Part-time) mặc định ẩn theo yêu cầu.
 */
export const isCollectionHidden = (collectionSlug: string) => {
  return ({ user }: { user: any }) => {
    if (!user) return true;
    if (user.role === ROLES.ADMIN) return false;

    // Teacher Full-time và Part-time luôn bị ẩn khỏi sidebar cho các collection này
    if (
      user.role === ROLES.TEACHER_FULL_TIME ||
      user.role === ROLES.TEACHER_PART_TIME
    ) {
      return true;
    }

    return false;
  };
};
