"use client";
import { useEffect, useRef } from "react";

/**
 * Hook to listen for real-time schedule updates via SSE
 * @param onUpdate
 */
export function useRealtime(onUpdate: (data?: any) => void) {
  const onUpdateRef = useRef<(data?: any) => void>(onUpdate);
  const retryCountRef = useRef(0);
  const maxRetries = 10;
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isConnecting = false;

    const connect = () => {
      if (
        isConnecting ||
        (eventSource && eventSource.readyState !== EventSource.CLOSED)
      ) {
        return;
      }
      isConnecting = true;

      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource("/api/SSE");

      const resetWatchdog = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
          console.warn("Đang kết nối lại...");
          if (eventSource) eventSource.close();
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            connect();
          }
        }, 35000);
      };

      eventSource.onopen = () => {
        console.log("Kết nối SSE thành công!");
        isConnecting = false;
        retryCountRef.current = 0;
        resetWatchdog();
      };

      eventSource.onmessage = (event: MessageEvent) => {
        resetWatchdog();
        try {
          console.log("Đã nhận tín hiệu cập nhật từ máy chủ:", event.data);
          const data = JSON.parse(event.data);
          onUpdateRef.current(data);
        } catch (err) {
          console.error("Lỗi xử lý thông báo SSE:", err);
        }
      };

      eventSource.addEventListener("ping", () => {
        resetWatchdog();
      });

      eventSource.onerror = (err) => {
        isConnecting = false;
        console.error("Kết nối SSE có lỗi hoặc bị ngắt.");
        if (eventSource) eventSource.close();

        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.min(2000 * retryCountRef.current, 10000);
          console.log(`Đang thử kết nối lại sau ${delay}ms...`);
          setTimeout(connect, delay);
        } else {
          console.error("Đã đạt giới hạn lỗi, ngừng thử lại kết nối tự động.");
        }
      };
    };

    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          console.log("kiểm tra bắt buộc kết nối...");
          retryCountRef.current = 0;
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      console.log("  Đóng kết nối SSE (Cleanup).");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);
}
