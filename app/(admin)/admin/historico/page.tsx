import { Suspense } from "react";
import { AdminAuditList } from "@/components/admin/audit/AdminAuditList";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminAuditList />
    </Suspense>
  );
}
