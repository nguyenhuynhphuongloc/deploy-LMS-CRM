import { getPayload } from "payload";
import type { Lead } from "../payload-types";
import config from "../payload.config";

/**
 * Migration script to update displayTitle for existing Leads and Users.
 * Run with: npx tsx src/scripts/migrateDisplayTitles.ts
 */
async function migrate() {
  console.log("Initializing Payload...");
  const payload = await getPayload({ config });

  console.log("\n--- Migrating Users ---");
  const users = await payload.find({
    collection: "users",
    limit: 0,
    depth: 1, // Populate lead to get fullName and phone
  });

  console.log(`Found ${users.docs.length} users.`);
  for (const user of users.docs) {
    const lead = user.lead as Lead | null | undefined;
    const username = user.username || "";

    let newDisplayTitle = "";
    if (lead) {
      const fullName = (lead.fullName || "").trim();
      const phone = (lead.phone || "").trim();
      if (fullName) {
        newDisplayTitle = `${fullName}${phone ? ` - ${phone}` : ""}`;
      } else {
        newDisplayTitle = phone || username || user.id;
      }
    } else {
      newDisplayTitle = username || user.id;
    }

    if ((user as any).displayTitle !== newDisplayTitle) {
      console.log(`Updating User [${user.id}]: ${newDisplayTitle}`);
      await payload.update({
        collection: "users",
        id: user.id,
        data: {
          displayTitle: newDisplayTitle,
        } as any,
        disableHooks: true,
      });
    }
  }

  console.log("\nMigration completed successfully!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
