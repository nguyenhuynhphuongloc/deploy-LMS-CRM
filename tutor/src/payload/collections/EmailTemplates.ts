import type { CollectionConfig } from "payload";
import { checkRolePermission, isCollectionHidden } from "../access";

export const EmailTemplates: CollectionConfig = {
  slug: "emailTemplates",
  labels: {
    singular: "Mẫu Email",
    plural: "Mẫu Email",
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "subject"],
    hidden: isCollectionHidden("emailTemplates"),
  },
  access: checkRolePermission("emailTemplates"),
  fields: [
    {
      name: "title",
      label:
        "Tên mẫu (Hệ thống sẽ tìm mẫu theo tên này: Cảnh báo lần 1, Cảnh báo lần 2, Hủy cam kết)",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "subject",
      label: "Tiêu đề Email (Subject)",
      type: "text",
      required: true,
    },
    {
      name: "image",
      label: "Ảnh đính kèm banner",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "content",
      label: "Nội dung thư (HTML)",
      type: "textarea",
      required: true,
      admin: {
        description:
          "Hỗ trợ thẻ HTML cơ bản (<br/>, <b>, <i>, <p>). Các biến được hỗ trợ tự động điền: {{studentName}}, {{violationList}}, {{levelText}}",
        rows: 15,
      },
    },
  ],
};
