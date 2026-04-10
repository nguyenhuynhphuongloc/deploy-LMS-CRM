"use server";

import configPromise from "@payload-config";
import { getPayload } from "payload";

import { cache } from "react";

const updateLead = cache(async (leadId: string, data: any) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.update({
    collection: "leads",
    id: leadId,
    data,
  });
});

const updateUser = cache(async (userId: string, avatar: string) => {
  const payload = await getPayload({ config: configPromise });
  return await payload.update({
    collection: "users",
    id: userId,
    data: {
      avatar,
    },
  });
});

export async function updateLeadProfile({
  leadId,
  userId,
  data,
}: {
  leadId: string;
  userId?: string;
  data: {
    fullName?: string;
    type?: string;
    phone?: string;
    email?: string;
    link_facebook?: string;
    date_of_birth?: string | Date;
    avatar?: string;
  };
}) {
  try {
    const updatedLead = await updateLead(leadId, data);

    if (userId && data.avatar) {
      await updateUser(userId, data.avatar);
    }

    return { success: true, data: updatedLead as any };
  } catch (error: any) {
    console.error("Error updating lead profile:", error);
    return {
      success: false,
      message: error.message || "Đã có lỗi xảy ra khi cập nhật thông tin.",
    };
  }
}
