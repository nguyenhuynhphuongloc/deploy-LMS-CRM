import { isAdmin } from "../access";
import type { CollectionConfig } from "payload";

export const DashboardHocVu: CollectionConfig = {
  slug: "dashboard_hoc_vu",
  labels: {
    singular: "Quản lí lớp học",
    plural: "Quản lí lớp học",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    components: {
      views: {
        list: {
          Component: "@/components/DashboardHocVu/index.tsx",
        },
      },
    },
    group: "Quản lý",
  },
  fields: [
    {
      name: "settings",
      type: "json",
      admin: {
        hidden: true,
      },
    },
  ],
};
