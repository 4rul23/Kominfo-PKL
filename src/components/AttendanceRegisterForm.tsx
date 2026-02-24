"use client";

import { useRouter } from "next/navigation";
import AttendanceWizard from "@/components/AttendanceWizard";

// Deprecated wrapper: keep this component for compatibility with existing imports.
export default function AttendanceRegisterForm() {
    const router = useRouter();
    return <AttendanceWizard onClose={() => router.push("/")} />;
}
