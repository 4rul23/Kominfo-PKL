const encoder = new TextEncoder();

type StreamController = ReadableStreamDefaultController<Uint8Array>;

const streamControllers = new Set<StreamController>();

function encodeSse(event: string, payload: Record<string, unknown>): Uint8Array {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    return encoder.encode(message);
}

export function registerAttendanceStream(controller: StreamController): () => void {
    streamControllers.add(controller);
    controller.enqueue(
        encodeSse("connected", {
            ok: true,
            ts: Date.now(),
        }),
    );

    return () => {
        streamControllers.delete(controller);
    };
}

export function emitAttendanceUpdated(reason = "updated"): void {
    if (streamControllers.size === 0) return;

    const packet = encodeSse("attendance-updated", {
        reason,
        ts: Date.now(),
    });

    for (const controller of streamControllers) {
        try {
            controller.enqueue(packet);
        } catch {
            streamControllers.delete(controller);
        }
    }
}

export function emitAttendanceKeepAlive(controller: StreamController): void {
    try {
        controller.enqueue(encoder.encode(":keep-alive\n\n"));
    } catch {
        streamControllers.delete(controller);
    }
}
