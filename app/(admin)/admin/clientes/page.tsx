import { Suspense } from "react";
import { AdminAccountsList } from "@/components/admin/accounts/AdminAccountsList";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminAccountsList />
    </Suspense>
  );
}
