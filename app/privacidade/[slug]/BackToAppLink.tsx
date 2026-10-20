"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hasStoredSession } from "@/lib/session-storage";

export function BackToAppLink({ className }: { className?: string }) {
  const [href, setHref] = useState("/login");

  useEffect(() => {
    if (hasStoredSession()) setHref("/dashboard");
  }, []);

  return (
    <Link href={href} className={className}>
      Voltar para o app
    </Link>
  );
}
