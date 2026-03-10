import { redirect } from "next/navigation";

import RegisterEventSelector from "@/components/RegisterEventSelector";
import { normalizeSearchParamEventCode } from "@/lib/attendanceEventUtils";

interface RegisterPageProps {
    searchParams?: Promise<{
        event?: string | string[];
    }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
    const query = searchParams ? await searchParams : {};
    const preferredEventCode = normalizeSearchParamEventCode(query?.event);
    if (preferredEventCode) {
        redirect(`/e/${encodeURIComponent(preferredEventCode)}/register`);
    }

    return <RegisterEventSelector />;
}
