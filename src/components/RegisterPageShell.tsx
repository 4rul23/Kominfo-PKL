"use client";

import { useRouter } from "next/navigation";
import AttendanceWizard from "@/components/AttendanceWizard";

interface RegisterPageShellProps {
    preferredEventCode: string;
}

export default function RegisterPageShell({ preferredEventCode }: RegisterPageShellProps) {
    const router = useRouter();
    const closePath = preferredEventCode
        ? `/?event=${encodeURIComponent(preferredEventCode)}`
        : "/";

    return (
        <AttendanceWizard
            onClose={() => router.push(closePath)}
            preferredEventCode={preferredEventCode}
        />
    );
}
