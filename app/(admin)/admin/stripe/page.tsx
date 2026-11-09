import { Suspense } from "react";
import { AdminStripeEvents } from "@/components/admin/stripe-events/AdminStripeEvents";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminStripeEvents />
    </Suspense>
  );
}
