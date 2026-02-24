"use client";

import AttendanceWizard from "@/components/AttendanceWizard";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();

    return (
        <div className="kiosk-viewport bg-[#f8fafc] register-a11y-root">
            <AttendanceWizard onClose={() => router.push("/")} />
        </div>
    );
}
