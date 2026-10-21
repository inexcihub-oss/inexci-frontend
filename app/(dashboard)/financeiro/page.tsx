"use client";

import { Suspense } from "react";
import { FinanceTabs } from "@/components/finance/FinanceTabs";

export default function FinanceiroPage() {
  return (
    <Suspense fallback={null}>
      <FinanceTabs />
    </Suspense>
  );
}
