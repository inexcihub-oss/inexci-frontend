"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import Loading from "@/components/ui/Loading";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para dashboard se estiver autenticado, senão para login
    if (authService.isAuthenticated()) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loading size="lg" />
    </div>
  );
}
