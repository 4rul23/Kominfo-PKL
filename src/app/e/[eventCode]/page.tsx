import { redirect } from "next/navigation";

import { normalizeAttendanceEventCode } from "@/lib/attendanceEventUtils";

interface EventPageProps {
    params: Promise<{ eventCode: string }>;
}

export default async function EventDashboardRedirectPage({ params }: EventPageProps) {
    const routeParams = await params;
    const eventCode = normalizeAttendanceEventCode(routeParams.eventCode);
    if (!eventCode) {
        redirect("/");
    }
    redirect(`/?event=${encodeURIComponent(eventCode)}`);
}
