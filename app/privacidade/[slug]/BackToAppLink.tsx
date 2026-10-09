"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function BackToAppLink({ className }: { className?: string }) {
  const [href, setHref] = useState("/login");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw && raw !== "undefined" && raw !== "null") {
        const user = JSON.parse(raw);
        if (user?.id) setHref("/dashboard");
      }
    } catch {
    }
  }, []);

  return (
    <Link href={href} className={className}>
      Voltar para o app
    </Link>
  );
}
