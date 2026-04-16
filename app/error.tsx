"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro global na aplicação:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-8">
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">
          Ocorreu um erro inesperado
        </h1>
        <p className="mt-3 text-sm md:text-base text-neutral-600">
          Tente novamente em alguns instantes. Se o problema persistir, contate
          o suporte.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 text-neutral-700 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 transition-colors"
          >
            Voltar ao dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
