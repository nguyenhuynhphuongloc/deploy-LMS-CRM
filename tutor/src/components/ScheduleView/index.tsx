import ScheduleViewClient from "@/components/ScheduleView/index.client";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter, SetStepNav, type StepNavItem } from "@payloadcms/ui";
import type { AdminViewServerProps } from "payload";
import React from "react";

export const ScheduleView: React.FC<AdminViewServerProps> = ({
  initPageResult,
  params,
  searchParams,
}) => {
  if (!initPageResult.req.user) {
    return <p>Vui lòng đăng nhập để xem trang này.</p>;
  }

  const steps: StepNavItem[] = [
    {
      url: "/admin/lich-wow",
      label: "Lịch WOW",
    },
  ];

  return (
    <DefaultTemplate
      visibleEntities={initPageResult.visibleEntities}
      i18n={initPageResult.req.i18n}
      payload={initPageResult.req.payload}
      locale={initPageResult.locale}
      params={params}
      permissions={initPageResult.permissions}
      user={initPageResult.req.user || undefined}
      searchParams={searchParams}
    >
      <SetStepNav nav={steps} />
      <Gutter>
        <div style={{ marginTop: "20px" }}>
          <ScheduleViewClient />
        </div>
      </Gutter>
    </DefaultTemplate>
  );
};

export default ScheduleView;
