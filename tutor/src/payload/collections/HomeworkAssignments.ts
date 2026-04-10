import type { CollectionConfig } from "payload";
import { checkRolePermission } from "../access";

export const HomeworkAssignments: CollectionConfig = {
  slug: "homework-assignments",
  labels: {
    plural: "Giao bài tập",
    singular: "Giao bài tập",
  },
  admin: {
    useAsTitle: "id",
    group: "Giáo viên",
    defaultColumns: ["class", "teachers", "type_class", "createdAt"],
  },
  access: checkRolePermission("homework-assignments"),
  fields: [
    {
      name: "class",
      label: "Lớp học",
      type: "relationship",
      relationTo: "classes",
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: "teachers",
      label: "Giáo viên",
      type: "relationship",
      relationTo: "admins",
      hasMany: true,
      required: true,
      admin: {
        readOnly: true,
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
      admin: {
        readOnly: true,
      },
    },
    {
      name: "assignment",
      type: "ui",
      admin: {
        components: {
          Field: "@/payload/components/AssignmentTool",
        },
      },
    },
    {
      name: "data",
      type: "json",
      defaultValue: {},
      admin: {
        hidden: true,
        description:
          "Lưu trữ thông tin giao bài tập (session id -> homework mapping)",
      },
    },
  ],
};

export default HomeworkAssignments;
