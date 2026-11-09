import { Suspense } from "react";
import { AdminSecurity } from "@/components/admin/security/AdminSecurity";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSecurity />
    </Suspense>
  );
}
