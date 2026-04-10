"use client";
import { useAuth, useFormFields } from "@payloadcms/ui";
import React, { useEffect, useRef } from "react";

const ROLES = {
  ADMIN: "admin",
};

export const SessionLock: React.FC<{ path: string }> = ({ path }) => {
  const { user } = useAuth();
  // path: "sessions.0.lock" -> rowPath: "sessions.0"
  const rowPath = path.substring(0, path.lastIndexOf("."));
  const datePath = `${rowPath}.date`;

  const dateValue = useFormFields(([fields]) => fields[datePath]?.value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userRole = user?.role;

    if (!containerRef.current) return;
    if (userRole === ROLES.ADMIN) return;
    if (!userRole) return;

    // Tìm container của dòng (row) trong array
    // Trong Payload 3, mỗi row thường được bao bọc bởi một div có class liên quan đến array row
    const rowContainer = (containerRef.current as HTMLElement).closest(
      'div[class*="ArrayField"] li, .array-field__row, [id^="sessions-row-"]',
    ) as HTMLElement;

    if (!rowContainer) return;

    // Quản lý overlay
    let overlay = rowContainer.querySelector(
      ".session-lock-overlay",
    ) as HTMLElement;

    if (dateValue) {
      const sessionDate = new Date(dateValue as string);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (sessionDate < today) {
        // Ẩn nút xóa (Remove) cho buổi học cũ
        // Nếu nút xóa nằm trong portal/ngoài rowContainer, ta cố gắng tìm nút trigger menu hoặc chính nó nếu nó vẫn nằm đâu đó gần
        const removeButton = rowContainer.querySelector(
          ".array-actions__remove, button[class*='remove'], .array-field__remove-row, .array-actions",
        ) as HTMLElement;

        if (removeButton) {
          removeButton.style.display = "none";
        }

        // Tìm thêm nút "Actions" (dấu 3 chấm) thường chứa menu xóa
        const actionsTrigger = rowContainer.querySelector(
          'button[class*="array-actions__button"], button[aria-label*="Actions"]',
        ) as HTMLElement;
        if (actionsTrigger) {
          actionsTrigger.style.display = "none";
        }

        if (!overlay) {
          overlay = document.createElement("div");
          overlay.className = "session-lock-overlay";
          overlay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: flex-start; padding: 4px 12px; height: 32px; gap: 8px; color: #3FAFC6; font-weight: bold; font-size: 12px; background: rgba(63, 175, 198, 0.1); border-radius: 4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Buổi học đã kết thúc ( Không được xóa )</span>
            </div>
          `;
          Object.assign(overlay.style, {
            position: "relative",
            width: "100%",
            zIndex: "0",
            pointerEvents: "none", // Cho phép click xuyên qua để edit
          });
          // Chèn overlay vào đầu rowContainer thay vì đè lên toàn bộ
          rowContainer.prepend(overlay);
        }
        rowContainer.style.opacity = "1"; // Không làm mờ nữa để dễ nhìn khi edit
        rowContainer.style.filter = "none";
      } else {
        if (overlay) overlay.remove();
        // Hiển thị lại nút xóa nếu date thay đổi thành tương lai
        const removeButton = rowContainer.querySelector(
          'button[class*="remove"], .array-field__remove-row, button[aria-label*="Remove"]',
        ) as HTMLElement;
        if (removeButton) {
          removeButton.style.display = "";
        }
      }
    } else {
      if (overlay) overlay.remove();
    }

    return () => {
      if (overlay) overlay.remove();
    };
  }, [dateValue, user]);

  return <div ref={containerRef} style={{ display: "none" }} />;
};

export default SessionLock;
