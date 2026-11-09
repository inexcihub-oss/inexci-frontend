import { Suspense } from "react";
import { AdminQueues } from "@/components/admin/queues/AdminQueues";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminQueues />
    </Suspense>
  );
}
