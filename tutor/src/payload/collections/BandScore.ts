import type { CollectionConfig } from "payload";
import { checkRolePermission, isCollectionHidden } from "../access";

export const BandScore: CollectionConfig = {
  slug: "band_score",
  access: checkRolePermission("band_score"),
  labels: { plural: "Band Score", singular: "Band Score" },
  admin: {
    useAsTitle: "score",
    group: "Cấu Hình",
    hidden: isCollectionHidden("band_score"),
  },
  fields: [
    {
      name: "score",
      label: "Band Score",
      type: "text",
      required: true,
    },
    {
      name: "skillLevel",
      label: "Skill Level",
      type: "textarea",
    },
    {
      name: "description",
      label: "Mô tả",
      type: "textarea",
    },
  ],
};
