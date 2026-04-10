import type { CollectionConfig } from "payload";
import { checkRolePermission } from "../access";

export const Timekeeping: CollectionConfig = {
  slug: "timekeeping",
  labels: {
    singular: "Chấm công",
    plural: "Chấm công",
  },
  access: checkRolePermission("timekeeping"),
  admin: {
    group: "Kế toán",
    hideAPIURL: true,
    components: {
      views: {
        list: {
          Component: "@/components/Timekeeping/index#default",
        },
      },
    },
  },
  fields: [
    // Payload requires at least one field to show the collection in sidebar
    // even if we override the list view
    {
      name: "dummy",
      type: "text",
      admin: {
        hidden: true,
      },
    },
  ],
};
