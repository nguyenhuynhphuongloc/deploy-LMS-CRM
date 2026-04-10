import { GlobalConfig } from "payload";

export const ViolationRules: GlobalConfig = {
  slug: "violation-rules",
  label: "Cấu hình vi phạm (Bền vững)",
  admin: {
    hidden: true,
  },
  access: {
    read: () => true,
    update: () => true,
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "no_camera_threshold",
          label: "Threshold: No Camera (Warning 1)",
          type: "number",
          defaultValue: 4,
          required: true,
          admin: { width: "33%" },
        },
        {
          name: "no_camera_warning_2",
          label: "Threshold: No Camera (Warning 2)",
          type: "number",
          defaultValue: 6,
          required: true,
          admin: { width: "33%" },
        },
        {
          name: "no_camera_terminated",
          label: "Threshold: No Camera (Terminated)",
          type: "number",
          defaultValue: 8,
          required: true,
          admin: { width: "33%" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "absent_without_permission_threshold",
          label: "Threshold: Absent (W/O Perm) (Warning 1)",
          type: "number",
          defaultValue: 3,
          required: true,
          admin: { width: "33%" },
        },
        {
          name: "absent_without_permission_warning_2",
          label: "Threshold: Absent (W/O Perm) (Warning 2)",
          type: "number",
          defaultValue: 5,
          required: true,
          admin: { width: "33%" },
        },
        {
          name: "absent_without_permission_terminated",
          label: "Threshold: Absent (W/O Perm) (Terminated)",
          type: "number",
          defaultValue: 7,
          required: true,
          admin: { width: "33%" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "absent_with_permission_threshold",
          label: "Threshold: Absent (W/ Perm) (Warning 1)",
          type: "number",
          defaultValue: 10,
          required: true,
          admin: { width: "33%" },
        },
        {
          name: "absent_with_permission_warning_2",
          label: "Threshold: Absent (W/ Perm) (Warning 2)",
          type: "number",
          defaultValue: 15,
          required: true,
          admin: { width: "33%" },
        },
        {
          name: "absent_with_permission_terminated",
          label: "Threshold: Absent (W/ Perm) (Terminated)",
          type: "number",
          defaultValue: 20,
          required: true,
          admin: { width: "33%" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "late_homework_threshold",
          label: "Threshold: Late Homework (Warning 1)",
          type: "number",
          defaultValue: 5,
          required: true,
          admin: { width: "33%" },
        },
        {
          name: "late_homework_warning_2",
          label: "Threshold: Late Homework (Warning 2)",
          type: "number",
          defaultValue: 8,
          required: true,
          admin: { width: "33%" },
        },
        {
          name: "late_homework_terminated",
          label: "Threshold: Late Homework (Terminated)",
          type: "number",
          defaultValue: 10,
          required: true,
          admin: { width: "33%" },
        },
      ],
    },
  ],
};
