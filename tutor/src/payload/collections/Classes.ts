/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable
  @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-return
*/

import { SKILLS_OPTIONS } from "@/constants";
import type { CollectionConfig, FieldAccess, Where } from "payload";
import { checkRolePermission, ROLES } from "../access";
import afterChangeClasses from "../hooks/afterChangeClasses";
import beforeChangeClasses from "../hooks/beforeChangeClasses";
import beforeDeleteClasses from "../hooks/beforeDeleteClasses";

const isTeacher: FieldAccess = ({ req: { user } }) => {
  return (
    user?.role === ROLES.TEACHER_FULL_TIME ||
    user?.role === ROLES.TEACHER_PART_TIME
  );
};

const DAYS_OF_WEEK_OPTIONS = [
  { label: "Thứ 2", value: "1" },
  { label: "Thứ 3", value: "2" },
  { label: "Thứ 4", value: "3" },
  { label: "Thứ 5", value: "4" },
  { label: "Thứ 6", value: "5" },
  { label: "Thứ 7", value: "6" },
  { label: "Chủ nhật", value: "0" },
];

const isFieldEditable =
  (fieldName: string): FieldAccess =>
  ({ req: { user }, data }) => {
    if (!user) return false;
    if (user.role === ROLES.ADMIN) return true;

    // Teacher chỉ được sửa 'sessions'
    if (
      user.role === ROLES.TEACHER_FULL_TIME ||
      user.role === ROLES.TEACHER_PART_TIME
    ) {
      return fieldName === "sessions";
    }

    // Nếu class status là 'active', chỉ cho phép sửa 1 số field nhất định
    if (data?.status_class === "active") {
      const allowedFields = [
        "students",
        "status_class",
        "link_zoom",
        "room",
        "teachers",
        "sessions",
      ];
      return allowedFields.includes(fieldName);
    }

    return true;
  };

export const Classes: CollectionConfig = {
  slug: "classes",
  labels: { plural: "Lớp học", singular: "Lớp học" },
  access: checkRolePermission("classes"),
  admin: {
    defaultColumns: [
      "name",
      "type_class",
      "startDate",
      "branch",
      "teachers",
      "course",
      "status_class",
      "take_care",
    ],
    useAsTitle: "name",
  },
  hooks: {
    beforeChange: [beforeChangeClasses],
    afterChange: [afterChangeClasses],
    beforeDelete: [beforeDeleteClasses],
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "name",
          label: "Mã Lớp Học",
          type: "text",
          required: true,
          access: {
            update: isFieldEditable("name"),
          },
        },
        {
          name: "type_class",
          label: "Loại lớp học",
          type: "select",
          options: [
            { label: "Lớp nhóm", value: "group" },
            { label: "Lớp 1 kèm 1", value: "one_to_one" },
          ],
          defaultValue: "group",
          access: {
            update: isFieldEditable("type_class"),
          },
        },
        {
          name: "course",
          label: "Khóa học",
          type: "relationship",
          relationTo: "courses",
          admin: {
            condition: (data) => data?.type_class === "group",
          },
          access: {
            update: isFieldEditable("course"),
          },
        },
        {
          name: "startDate",
          label: "Ngày Khai Giảng",
          type: "date",
          required: true,
          admin: {
            date: {
              displayFormat: "dd/MM/yyyy",
            },
          },
          access: {
            update: isFieldEditable("startDate"),
          },
        },
      ],
    },

    {
      type: "row",
      fields: [
        {
          name: "days_of_week",
          label: "Ngày học trong tuần",
          type: "select",
          options: DAYS_OF_WEEK_OPTIONS,
          hasMany: true,
          admin: {
            description:
              "Học vào những ngày nào trong tuần. Ví dụ: Thứ 2, Thứ 4, Thứ 6. Được chọn nhiều",
          },
          access: {
            update: isFieldEditable("days_of_week"),
          },
        },
        {
          name: "session_time",
          label: "Thời gian học",
          type: "date",
          admin: {
            date: {
              pickerAppearance: "timeOnly",
            },
            condition: (data) => data?.type_class === "group",
          },
          access: {
            update: isFieldEditable("session_time"),
          },
        },
        {
          name: "total_hours",
          label: "Tổng số giờ học",
          type: "number",
          admin: { condition: (data) => data?.type_class === "one_to_one" },
          access: {
            update: isFieldEditable("total_hours"),
          },
        },
        {
          name: "time_per_session",
          label: "Thời gian mỗi buổi học ( tiếng )",
          type: "number",
          required: true,
          access: {
            update: isFieldEditable("time_per_session"),
          },
          admin: {
            condition: (data) => data?.type_class === "group",
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "students",
          label: "Học viên",
          type: "relationship",
          relationTo: "users",
          hasMany: true,
          access: {
            update: isFieldEditable("students"),
          },
          maxDepth: 3,
          // filterOptions: async ({ data, req: { payload } }) => {
          //   const { course } = data;
          //   if (!course) return {};
          //   const { docs } = await payload.find({
          //     collection: "orders",
          //     limit: 1000,
          //     where: {
          //       courses: { equals: course },
          //     },
          //   });
          //   console.log("🚀 ~ docs:", docs);
          //   const ids = docs.map((order: Order) => order.customer.id);
          //   const { docs: classes } = await payload.find({
          //     collection: "classes",
          //     limit: 1000,
          //     where: {
          //       course,
          //       status_class: { in: ["active", "closed"] },
          //     },
          //   });
          //   const studentStudiedIds = [
          //     ...new Set(
          //       classes.flatMap((item) =>
          //         item.students.map((student) => student.id),
          //       ),
          //     ),
          //   ];

          //   const studentAvailableIds = ids.filter(
          //     (id) => !studentStudiedIds.includes(id),
          //   );

          //   return {
          //     id: {
          //       in: studentAvailableIds,
          //     },
          //   };
          // },
        },
        {
          name: "status_class",
          label: "Trạng Thái Lớp",
          type: "select",
          defaultValue: "opening",
          access: {
            update: isFieldEditable("status_class"),
          },
          options: [
            { label: "Đã mở", value: "opening" },
            { label: "Đang diễn ra", value: "active" },
            { label: "Kết thúc", value: "closed" },
          ],
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "link_zoom",
          label: "Link zoom",
          type: "text",
          access: {
            update: isFieldEditable("link_zoom"),
          },
        },
        {
          name: "branch",
          label: "Cơ sở",
          type: "relationship",
          relationTo: "branches",
          access: {
            update: isFieldEditable("branch"),
          },
        },
        {
          name: "room",
          label: "Phòng học",
          type: "relationship",
          relationTo: "rooms",
          admin: {
            condition: (data) => data?.branch,
          },
          access: {
            update: isFieldEditable("room"),
          },
          filterOptions: async ({ data, req }): Promise<boolean | Where> => {
            if (!data?.branch) return true;

            const branchId =
              typeof data.branch === "object" ? data.branch.id : data.branch;

            const branchDoc = await req.payload.findByID({
              collection: "branches",
              id: branchId,
            });

            if (!branchDoc?.rooms?.length) {
              return false;
            }

            return {
              id: {
                in: branchDoc.rooms.map((room: any) => room.id || room),
              },
            };
          },
        },
      ],
    },

    {
      name: "teachers",
      label: "Giáo viên phụ trách",
      type: "array",
      labels: { singular: "Giáo viên", plural: "Giáo viên" },
      access: {
        update: isFieldEditable("teachers"),
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "teacher",
              label: "Giáo viên",
              type: "relationship",
              relationTo: "admins",
              filterOptions: () => ({
                role: {
                  in: [ROLES.TEACHER_PART_TIME, ROLES.TEACHER_FULL_TIME],
                },
              }),
              admin: {
                description:
                  "Chọn giáo viên phụ trách cho lớp. Được chọn nhiều. Chỉ hiển thị giáo viên full-time và part-time",
              },
            },
            {
              name: "skill",
              label: "Kĩ năng",
              type: "select",
              hasMany: true,
              options: SKILLS_OPTIONS,
            },
            {
              name: "days_of_week",
              label: "Ngày dạy trong tuần",
              type: "select",
              options: DAYS_OF_WEEK_OPTIONS,
              validate: (val, { data }) => {
                const classDays = (data as any)?.days_of_week || [];
                const selectedDays = (val as string[]) || [];
                const invalidDays = selectedDays.filter(
                  (day) => !classDays.includes(day),
                );
                if (invalidDays.length > 0) {
                  return `Ngày dạy của giáo viên phải thuộc các ngày học của lớp.`;
                }
                return true;
              },
              hasMany: true,
              admin: {
                description:
                  "Dạy vào những ngày nào trong tuần. Ví dụ: Thứ 2, Thứ 4, Thứ 6. Được chọn nhiều",
              },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "session_time",
              label: "Thời gian học",
              type: "date",
              admin: {
                date: {
                  pickerAppearance: "timeOnly",
                },
                condition: (data) => data?.type_class === "one_to_one",
              },
            },
            {
              name: "duration",
              label: "Số giờ mỗi buổi học",
              type: "number",
              admin: {
                condition: (data) => data?.type_class === "one_to_one",
              },
            },
          ],
        },
      ],
    },
    {
      name: "total_hours_display",
      type: "ui",
      admin: {
        components: {
          Field: "@/payload/components/TotalHoursDisplay",
        },
      },
    },
    {
      type: "array",
      name: "sessions",
      label: "Buổi học",
      labels: { singular: "Buổi học", plural: "Buổi học" },
      access: {
        update: isFieldEditable("sessions"),
      },
      validate: (val, { data }) => {
        const _data = data as any;
        if (_data?.type_class === "one_to_one" && _data?.total_hours) {
          const sessions = (val as any[]) || [];
          const totalDuration = sessions.reduce((sum, session) => {
            return sum + (Number(session?.duration) || 0);
          }, 0);
          console.log(
            `[Classes Hook] totalDuration=${totalDuration}, total_hours=${_data.total_hours}`,
          );
          if (totalDuration > _data.total_hours) {
            return `Tổng số giờ học của các buổi (${totalDuration}h) vượt quá tổng số giờ học cho phép (${_data.total_hours}h)`;
          }
        }
        return true;
      },
      fields: [
        {
          name: "lock",
          type: "ui",
          admin: {
            components: {
              Field: "@/payload/components/SessionLock",
            },
          },
        },
        {
          type: "row",
          fields: [
            {
              name: "date",
              label: "Ngày học",
              type: "date",
              required: true,
              admin: {
                date: {
                  pickerAppearance: "dayAndTime",
                  displayFormat: "dd/MM/yyyy HH:mm",
                },
                width: "50%",
              },
            },
            {
              name: "teacher",
              label: "Giáo viên",
              type: "relationship",
              relationTo: "admins",
              filterOptions: () => ({
                role: {
                  in: [ROLES.TEACHER_PART_TIME, ROLES.TEACHER_FULL_TIME],
                },
              }),
              admin: {
                width: "50%",
              },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "session_time",
              label: "Thời gian học",
              type: "date",
              admin: {
                date: {
                  pickerAppearance: "timeOnly",
                },
                condition: (data) => data?.type_class === "one_to_one",
              },
            },
            {
              name: "duration",
              label: "Số giờ mỗi buổi học",
              type: "number",
              admin: {
                condition: (data) => data?.type_class === "one_to_one",
              },
            },
          ],
        },
      ],
    },
    {
      type: "array",
      name: "roadmaps",
      label: "Roadmap",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "skill",
              label: "Kĩ năng",
              type: "select",
              options: SKILLS_OPTIONS,
            },
            {
              name: "content",
              label: "Nội dung",
              type: "textarea",
              required: true,
            },
          ],
        },
      ],
      access: {
        update: isFieldEditable("roadmaps"),
      },
    },
    {
      name: "take_care",
      label: "Chăm sóc",
      type: "ui",
      admin: {
        condition: ({ user }) =>
          [ROLES.HOC_VU_MANAGER, ROLES.HOC_VU_EXECUTIVE].includes(user?.role),
        components: {
          Cell: "@/payload/cell/TakeCareButton",
        },
      },
    },
  ],
};
