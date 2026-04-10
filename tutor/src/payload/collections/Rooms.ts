import type { CollectionConfig } from "payload";
import { checkRolePermission, isCollectionHidden } from "../access";

export const Rooms: CollectionConfig = {
  slug: "rooms",
  access: checkRolePermission("rooms"),
  labels: { plural: "Phòng Học", singular: "Phòng Học" },
  admin: {
    group: "Cấu Hình",
    useAsTitle: "name",
    hidden: isCollectionHidden("rooms"),
  },
  fields: [
    {
      name: "name",
      label: "Tên phòng",
      type: "text",
      required: true,
    },
    {
      name: "capacity",
      label: "Sức chứa",
      type: "number",
    },
    {
      name: "status",
      label: "Trạng thái phòng học",
      type: "select",
      options: [
        { label: "Đang hoạt động", value: "active" },
        { label: "Ngừng sử dựng", value: "unactive" },
      ],
    },
  ],
};
