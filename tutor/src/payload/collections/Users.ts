import type { CollectionConfig } from "payload";
import { checkRolePermission, ROLES } from "../access";
import afterChangeUsers from "../hooks/afterChangeUsers";

export const Users: CollectionConfig = {
  slug: "users",
  labels: { plural: "Học Viên", singular: "Học Viên" },
  admin: {
    hidden: ({ user }) => {
      return (
        user?.role === ROLES.TEACHER_FULL_TIME ||
        user?.role === ROLES.TEACHER_PART_TIME
      );
    },
    useAsTitle: "displayTitle",
    hideAPIURL: true,
    defaultColumns: ["displayTitle", "username", "lead", "violationStatus"],
  },
  auth: {
    loginWithUsername: true,
    tokenExpiration: 60 * 60 * 24 * 30, // 1 day
  },
  access: checkRolePermission("users"),
  hooks: {
    afterChange: [afterChangeUsers],
  },
  defaultPopulate: {
    lead: true,
    displayTitle: true,
    username: true,
    avatar: true,
    violationStatus: true,
  },
  fields: [
    {
      name: "avatar",
      type: "upload",
      relationTo: "media",
      admin: {
        position: "sidebar",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "role",
          type: "select",
          options: [{ label: "User", value: "user" }],
          required: true,
          defaultValue: "user",
        },
        {
          name: "lead",
          type: "relationship",
          relationTo: "leads",
          // admin: {
          //   components: {
          //     Field: "@/payload/select/SelectLead",
          //   },
          // },
          // hooks: {
          //   afterRead: [
          //     async ({ req: { payload }, value }) => {
          //       const data = await payload.findByID({
          //         collection: "leads",
          //         id: value,
          //       });
          //       return `${data?.fullName}${data?.phone ? ` - ${data?.phone}` : ""}`;
          //     },
          //   ],
          // },
        },
        {
          name: "violationStatus",
          type: "select",
          options: [
            { label: "Bình thường", value: "none" },
            { label: "Cảnh báo lần 1", value: "warning_1" },
            { label: "Cảnh báo lần 2", value: "warning_2" },
            { label: "Hủy cam kết", value: "terminated" },
          ],
          defaultValue: "none",
          admin: {
            position: "sidebar",
          },
        },
      ],
    },
    {
      name: "displayTitle",
      label: "Tên hiển thị",
      type: "text",
      admin: {
        hidden: true,
      },
    },
  ],
};
