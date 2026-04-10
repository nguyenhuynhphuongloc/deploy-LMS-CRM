import { ROLES } from "@payload-access";
import { Gutter } from "@payloadcms/ui";
import type { AdminViewServerProps } from "payload";
import React from "react";
import DashboardHocVuClient from "./index.client";

export const DashboardHocVuView: React.FC<AdminViewServerProps> = ({
  user,
  permissions,
  ...props
}) => {
  const allowedRoles: string[] = [
    ROLES.ADMIN,
    ROLES.HOC_VU_MANAGER,
    ROLES.HOC_VU_EXECUTIVE,
  ];
  const isAllowed = allowedRoles.includes(user?.role as string);

  if (!isAllowed) {
    return (
      <Gutter>
        <div className="py-20 text-center">
          <h2 className="text-2xl font-bold text-red-600">
            Truy cập bị từ chối
          </h2>
          <p className="mt-2 text-gray-500">
            Bạn không có quyền truy cập Quản lí lớp học.
          </p>
        </div>
      </Gutter>
    );
  }

  return (
    <Gutter>
      <div className="py-8">
        <DashboardHocVuClient />
      </div>
    </Gutter>
  );
};

export default DashboardHocVuView;
