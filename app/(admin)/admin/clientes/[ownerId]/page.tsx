"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { AdminAccountDetail } from "@/components/admin/accounts/AdminAccountDetail";

export default function Page() {
  const params = useParams<{ ownerId: string }>();
  return (
    <Suspense fallback={null}>
      <AdminAccountDetail ownerId={params.ownerId} />
    </Suspense>
  );
}
