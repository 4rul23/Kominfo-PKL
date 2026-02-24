import {
    emitAttendanceKeepAlive,
    registerAttendanceStream,
} from "@/lib/attendanceRealtimeHub";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KEEP_ALIVE_MS = 15000;

export async function GET(request: Request) {
    let stopStreaming = () => { };

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const unregister = registerAttendanceStream(controller);
            const keepAliveInterval = setInterval(() => {
                emitAttendanceKeepAlive(controller);
            }, KEEP_ALIVE_MS);
            const onAbort = () => {
                stopStreaming();
            };

            stopStreaming = () => {
                clearInterval(keepAliveInterval);
                unregister();
                request.signal.removeEventListener("abort", onAbort);
            };
            request.signal.addEventListener("abort", onAbort);
        },
        cancel() {
            stopStreaming();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
