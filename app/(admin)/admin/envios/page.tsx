import { Suspense } from "react";
import { AdminEnvios } from "@/components/admin/envios/AdminEnvios";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminEnvios />
    </Suspense>
  );
}
