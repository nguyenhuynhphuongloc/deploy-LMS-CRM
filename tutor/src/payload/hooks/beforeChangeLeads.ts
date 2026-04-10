import type { CollectionBeforeChangeHook } from "payload";
import type { Lead } from "@/payload-types";

/**
 * Hook before change for Lead collection.
 * 
 * 1. Extract coupon and courses to context for order creation in afterChange.
 * 2. Update displayTitle to "fullName - phone" format.
 */
const beforeChangeLeads: CollectionBeforeChangeHook<Lead> = async ({
  data,
  context,
}) => {
  // Sync coupon and courses to context (used in afterChange)
  context.coupon = data.coupon;
  context.courses = data.courses;

  // Prevent direct update of these virtual-ish fields if they are not in the schema
  // (though they are defined in Leads.ts fields, the previous logic deleted them)
  delete data.coupon;
  delete data.courses;

  // Update displayTitle
  const { fullName, phone } = data;
  const trimmedFullName = (fullName || "").trim();
  const newDisplayTitle = trimmedFullName
    ? `${trimmedFullName}${phone ? ` - ${phone}` : ""}`
    : phone || "";

  data.displayTitle = newDisplayTitle;

  return data;
};

export default beforeChangeLeads;
