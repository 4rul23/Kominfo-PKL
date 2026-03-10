"use client";

import { useRouter } from "next/navigation";

import RegistrationWizard from "@/components/RegistrationWizard";

export default function GuestPage() {
  const router = useRouter();

  return <RegistrationWizard isOpen onClose={() => router.push("/")} />;
}
