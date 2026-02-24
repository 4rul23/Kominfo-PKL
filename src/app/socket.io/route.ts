export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function emptySocketResponse(): Response {
    return new Response(null, {
        status: 204,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

export async function GET() {
    return emptySocketResponse();
}

export async function POST() {
    return emptySocketResponse();
}
