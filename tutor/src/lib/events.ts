import { EventEmitter } from "events";

// Global singleton to bridge between Payload hooks and Next.js API Routes
const globalWithEmitter = global as typeof globalThis & {
    scheduleEventEmitter: EventEmitter;
};

if (!globalWithEmitter.scheduleEventEmitter) {
    globalWithEmitter.scheduleEventEmitter = new EventEmitter();
    // Max listeners increased for concurrent SSE connections
    globalWithEmitter.scheduleEventEmitter.setMaxListeners(500);
}

export const scheduleEventEmitter = globalWithEmitter.scheduleEventEmitter;
