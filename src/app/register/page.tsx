"use client";

import RegistrationWizard from "@/components/RegistrationWizard";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();

    return (
        <div className="kiosk-viewport bg-[#f8fafc]">
            <RegistrationWizard
                isOpen={true}
                onClose={() => router.push("/")}
            />
        </div>
    );
}
