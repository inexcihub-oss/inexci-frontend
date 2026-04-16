"use client";

import { useEffect } from "react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no fluxo de autenticação:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-xl font-semibold text-neutral-900">
          Não foi possível concluir esta ação
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Tente novamente ou volte para a tela de login.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 text-neutral-700 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 transition-colors"
          >
            Ir para login
          </button>
        </div>
      </div>
    </div>
  );
}
