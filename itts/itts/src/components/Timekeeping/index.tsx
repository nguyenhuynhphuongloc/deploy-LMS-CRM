import { Gutter } from "@payloadcms/ui";
import type { AdminViewServerProps } from "payload";
import React from "react";
import TimekeepingClient from "./index.client";

export const TimekeepingView: React.FC<AdminViewServerProps> = () => {
  return (
    <Gutter>
      <div className="py-8">
        <TimekeepingClient />
      </div>
    </Gutter>
  );
};

export default TimekeepingView;
