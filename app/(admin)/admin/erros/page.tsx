import { Suspense } from "react";
import { AdminErrors } from "@/components/admin/errors/AdminErrors";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminErrors />
    </Suspense>
  );
}
