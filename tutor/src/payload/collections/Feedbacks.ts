import type { CollectionConfig } from "payload";
import { checkRolePermission } from "../access";
import { beforeChangeFeedback } from "../hooks/beforeChangeFeedback";

export const Feedbacks: CollectionConfig = {
  slug: "feedback",
  labels: {
    singular: "Feedback",
    plural: "Feedback",
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["class", "student", "teacher", "createdAt"],
    group: "Giáo viên",
  },
  hooks: {
    beforeChange: [beforeChangeFeedback],
  },
  access: checkRolePermission("feedback"),
  fields: [
    {
      name: "title",
      type: "text",
      defaultValue: "",
      admin: {
        hidden: true,
      },
    },
    {
      type: "row",
      admin: {
        hidden: true,
      },
      fields: [
        {
          name: "class",
          label: "Lớp học",
          type: "relationship",
          relationTo: "classes",
          required: true,
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: "feedback_data",
      label: "Dữ liệu đánh giá học viên",
      type: "json",
      defaultValue: {},
      admin: {
        hidden: true,
      },
    },
    {
      name: "student_review_session",
      label: "Đánh giá buổi học",
      type: "json",
      defaultValue: {},
      admin: {
        hidden: true,
      },
    },
    {
      name: "feedbackUI",
      label: "Bảng đánh giá học viên",
      type: "ui",
      admin: {
        components: {
          Field: "@/payload/components/ui/feedback.field#default",
        },
      },
    },
  ],
};
