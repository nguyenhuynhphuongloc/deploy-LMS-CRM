import type { Feedback } from "@/payload-types";
import type { CollectionBeforeChangeHook } from "payload";

export const beforeChangeFeedback: CollectionBeforeChangeHook<Feedback> = async ({
    data,
    req,
}) => {
    if (data.class) {
        const classDoc = await req.payload.findByID({
            collection: "classes",
            id: typeof data.class === "string" ? data.class : data.class.id,
            depth: 0,
        });
        data.title = (classDoc as any)?.name || data.class;
    }

    return data;
};
