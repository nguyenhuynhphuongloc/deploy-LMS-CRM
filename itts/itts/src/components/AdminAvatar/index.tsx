"use client";
import { ROLE_OPTIONS } from "@/payload/access";
import { useAuth } from "@payloadcms/ui";
import Image from "next/image";

const AdminAvatar = () => {
  const { user } = useAuth();
  const avatar = user?.avatar as any;
  const fullName =
    (user?.fullName as string) || (user?.email as string) || "Admin";
  const roleLabel =
    ROLE_OPTIONS.find((opt) => opt.value === user?.role)?.label || "";

  const renderAvatar = () => {
    if (avatar?.url) {
      return (
        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 shrink-0">
          <Image
            src={avatar.url}
            alt={fullName}
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        </div>
      );
    }

    const initial = fullName.charAt(0).toUpperCase();

    return (
      <div className="w-10 h-10 rounded-full bg-[#E72929] flex items-center justify-center text-white text-xs font-bold shrink-0">
        {initial}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-3 font-sans">
      {renderAvatar()}
      <div className="flex flex-col text-nowrap">
        <span className="text-[13px] font-bold text-[#1F2937] leading-tight">
          {fullName}
        </span>
        {roleLabel && (
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
            {roleLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default AdminAvatar;
