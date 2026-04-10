import type { CollectionConfig } from "payload";
import { checkRolePermission } from "../access";
import { afterChangeAttendanceRecord } from "../hooks/afterChangeAttendanceRecord";

export const AttendanceRecord: CollectionConfig = {
  slug: "attendanceRecords",
  labels: {
    singular: "Điểm danh",
    plural: "Điểm danh",
  },
  admin: {
    group: "Giáo viên",
    defaultColumns: ["class"],
  },
  access: checkRolePermission("attendanceRecords"),
  hooks: {
    afterChange: [afterChangeAttendanceRecord],
  },
  fields: [
    {
      name: "class",
      label: "Lớp học",
      type: "relationship",
      relationTo: "classes",
      hidden: false,
      admin: {
        readOnly: true,
        hidden: true,
      },
      required: true,
    },
    {
      name: "AttendanceRecord_data",
      type: "json",
      admin: {
        hidden: true,
      },
    },
    {
      name: "ViolationRecord_data",
      label: "Dữ liệu vi phạm",
      type: "json",
      admin: {
        hidden: true,
      },
    },
    {
      name: "attendance_record_ui",
      label: "Điểm danh",
      type: "ui",
      admin: {
        components: {
          Field: "@/payload/components/ui/AttendaceRecord.field#default",
        },
      },
    },
  ],
};
