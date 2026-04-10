"use client";
import { Link, NavGroup } from "@payloadcms/ui";
import { CalendarClock } from "lucide-react";
import { usePathname } from "next/navigation";

export const AfterNavLinksWowSessions = () => {
  const pathname = usePathname();

  const href = "/admin/wow-sessions";

  const active = pathname.includes(href);

  return (
    <NavGroup label={"Giáo viên"}>
      <Link
        href={href}
        className="nav__link cursor-pointer"
        id="nav-wow-sessions"
        style={{
          cursor: active ? "pointer" : "auto",
          pointerEvents: active ? "none" : "auto",
        }}
      >
        {active && <div className="nav__link-indicator" />}
        <div className="nav__link-label cursor-pointer flex items-center">
          <CalendarClock size={20} className="mr-1 nav__link-icon" />{" "}
          <span className="text-lg ml-1 capitalize">Wow</span>
        </div>
      </Link>
    </NavGroup>
  );
};

export default AfterNavLinksWowSessions;
