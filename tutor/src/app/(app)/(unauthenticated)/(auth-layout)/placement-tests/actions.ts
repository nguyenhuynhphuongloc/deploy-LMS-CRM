"use server";

import configPromise from "@payload-config";
import { getPayload } from "payload";

import { cache } from "react";

import { type RegisterSchemaType } from "./schema";

const getLeadByPhone = cache(async (phoneNumber: string) => {
  const payload = await getPayload({ config: configPromise });
  const { docs } = await payload.find({
    collection: "leads",
    limit: 1,
    where: {
      phone: {
        equals: phoneNumber,
      },
    },
  });
  return docs[0];
});

const getSaleInCharge = cache(async () => {
  const payload = await getPayload({ config: configPromise });

  // Priority 1: sale_manager
  const { docs: managers } = await payload.find({
    collection: "admins",
    where: { role: { equals: "sale_manager" } },
    limit: 1,
  });
  if (managers.length > 0) return managers[0].id;

  // Priority 2: sale_executive
  const { docs: executives } = await payload.find({
    collection: "admins",
    where: { role: { equals: "sale_executive" } },
    limit: 1,
  });
  if (executives.length > 0) return executives[0].id;

  // Priority 3: admin
  const { docs: admins } = await payload.find({
    collection: "admins",
    where: { role: { equals: "admin" } },
    limit: 1,
  });
  if (admins.length > 0) return admins[0].id;

  return null;
});

const createLead = cache(async (data: any) => {
  const payload = await getPayload({ config: configPromise });

  const saleInCharge = await getSaleInCharge();

  return await payload.create({
    collection: "leads",
    data: {
      ...data,
      saleInCharge,
    },
  });
});

export async function register({
  branch,
  email,
  fullName,
  phoneNumber,
  target,
}: RegisterSchemaType): Promise<{
  success: boolean;
  error_code?: "invalid_captcha" | "validation_error" | "internal_server_error";
  message?: string;
  data?: string;
}> {
  try {
    const existingLead = await getLeadByPhone(phoneNumber);

    if (existingLead?.id) {
      return { success: true, data: existingLead.id, message: undefined };
    }

    const { id } = await createLead({
      branch,
      email,
      fullName,
      phone: phoneNumber,
      target: Number(target),
      source: "from_website",
      status: "test_booked",
    });

    return { success: true, data: id, message: undefined };
  } catch (error) {
    return {
      success: false,
      error_code: "internal_server_error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
