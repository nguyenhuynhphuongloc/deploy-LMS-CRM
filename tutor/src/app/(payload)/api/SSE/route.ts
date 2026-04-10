import { scheduleEventEmitter } from "@/lib/events";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            const sendEvent = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            // Listener for the event-bus
            const onUpdate = (payload: any) => {
                console.log(" [SSE] Gửi tín hiệu cập nhật đến client:", payload);
                sendEvent(payload);
            };

            // Set retry to 3 seconds for faster reconnection
            controller.enqueue(encoder.encode("retry: 3000\n\n"));

            scheduleEventEmitter.on("schedule_updated", onUpdate);

            // Heartbeat to keep connection alive every 15s
            const heartbeat = setInterval(() => {
                controller.enqueue(encoder.encode(`event: ping\ndata: {"time": ${Date.now()}}\n\n`));
            }, 15000);

            // Close handling
            req.signal.addEventListener("abort", () => {
                clearInterval(heartbeat);
                scheduleEventEmitter.off("schedule_updated", onUpdate);
                try {
                    controller.close();
                } catch (e) {
                    // Already closed
                }
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
