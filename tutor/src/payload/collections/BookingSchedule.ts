import type { CollectionConfig } from "payload";
import { checkRolePermission } from "../access";
import { afterChangeBookingSchedule } from "../hooks/afterChangeBookingSchedule";
import { beforeChangeBookingScheduleData } from "../hooks/beforeChangeBookingScheduleData";

export const BookingSchedule: CollectionConfig = {
  slug: "booking_schedule",
  labels: { plural: "Đặt lịch", singular: "Đặt lịch" },
  admin: {
    group: "Giáo viên",
    useAsTitle: "id",
    defaultColumns: ["id", "createdAt", "updatedAt"],
  },
  access: checkRolePermission("booking_schedule"),
  hooks: {
    afterChange: [afterChangeBookingSchedule],
  },
  fields: [
    {
      name: "schedule_data",
      label: "Bảng đăng ký lịch",
      type: "json",
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [beforeChangeBookingScheduleData],
      },
    },
    {
      name: "wow_manager_config",
      label: "Cấu hình WOW Manager (Dành cho Dashboard Học viên)",
      type: "group",
      fields: [
        {
          name: "visibleWeeks",
          label: "Số tuần student thấy trên dashboard",
          type: "number",
          defaultValue: 2,
          admin: {
            description:
              "Ví dụ: 1 thì chỉ thấy tuần hiện tại, 2 thì thấy cả tuần sau.",
          },
        },
        {
          name: "leadTimeDays",
          label: "Số ngày học sinh phải đặt trước",
          type: "number",
          defaultValue: 1,
          admin: {
            description:
              "Ví dụ: 1 thì hôm nay thứ 4 không thể đặt các ca của thứ 4. 2 thì không thể đặt thứ 4 và thứ 5.",
          },
        },
        {
          name: "maxSlotsPerCell",
          label: "Số ca wower ở mỗi ô",
          type: "number",
          defaultValue: 3,
          admin: {
            description:
              "Số lượng cột (số học sinh tối đa) có thể đăng ký trong cùng một khung giờ.",
          },
        },
      ],
    },
  ],
};
