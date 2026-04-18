"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no dashboard:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-xl bg-white border border-neutral-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <h2 className="text-lg md:text-xl font-semibold text-neutral-900">
          Não foi possível carregar esta página
        </h2>
        <p className="mt-2 text-sm md:text-base text-neutral-600">
          Você pode tentar recarregar os dados agora.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Recarregar
          </button>
          <button
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 text-neutral-700 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 transition-colors"
          >
            Ir para início
          </button>
        </div>
      </div>
    </div>
  );
}
