const encoder = new TextEncoder();

type StreamController = ReadableStreamDefaultController<Uint8Array>;

const streamControllers = new Map<StreamController, string | null>();

function encodeSse(event: string, payload: Record<string, unknown>): Uint8Array {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    return encoder.encode(message);
}

export function registerAttendanceStream(
    controller: StreamController,
    sourceFilter: string | null = null,
): () => void {
    streamControllers.set(controller, sourceFilter);
    controller.enqueue(
        encodeSse("connected", {
            ok: true,
            ts: Date.now(),
            source: sourceFilter,
        }),
    );

    return () => {
        streamControllers.delete(controller);
    };
}

export function emitAttendanceUpdated(reason = "updated", source: string | null = null): void {
    if (streamControllers.size === 0) return;

    const packet = encodeSse("attendance-updated", {
        reason,
        source,
        ts: Date.now(),
    });

    for (const [controller, sourceFilter] of streamControllers) {
        if (sourceFilter && source && sourceFilter !== source) {
            continue;
        }
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
