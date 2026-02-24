import { redirect } from "next/navigation";

// Legacy route kept for compatibility. The operator directory now lives at /admin/directory.
export default function OperatorsRedirectPage() {
    redirect("/admin/directory");
}

