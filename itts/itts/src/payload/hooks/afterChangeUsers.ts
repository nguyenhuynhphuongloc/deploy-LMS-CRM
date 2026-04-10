import type { CollectionAfterChangeHook } from "payload";
import type { User, Lead } from "@/payload-types";

/**
 * After change hook for the "users" collection to update displayTitle.
 */
const afterChangeUsers: CollectionAfterChangeHook<User> = async ({
  req,
  doc,
  operation,
}) => {
  const { payload } = req;
  const { lead, username, id } = doc;

  let newDisplayTitle = "";
  if (lead) {
    const leadId = typeof lead === "object" ? lead.id : lead;
    try {
      const leadDoc = (await payload.findByID({
        collection: "leads",
        id: leadId,
      })) as Lead;
      const fullName = (leadDoc?.fullName || "").trim();
      const phone = (leadDoc?.phone || "").trim();

      if (fullName) {
        newDisplayTitle = `${fullName}${phone ? ` - ${phone}` : ""}`;
      } else {
        newDisplayTitle = phone || username || id;
      }
    } catch (error) {
      console.error(`Error fetching lead for user ${id}:`, error);
      newDisplayTitle = username || id;
    }
  } else {
    newDisplayTitle = username || id;
  }

  if ((doc as any).displayTitle !== newDisplayTitle) {
    await payload.update({
      collection: "users",
      id,
      data: {
        displayTitle: newDisplayTitle,
      },
      disableHooks: true,
      req,
    } as any);
  }
};

export default afterChangeUsers;
