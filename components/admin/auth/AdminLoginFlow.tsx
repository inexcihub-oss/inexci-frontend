"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/Loading";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ADMIN_LOGIN_PATH, resolveAdminNext } from "@/lib/admin-nav";
import type { AdminLoginStep } from "@/services/admin-auth.service";
import { AdminAuthShell } from "./AdminAuthShell";
import { AdminCredentialsForm } from "./AdminCredentialsForm";
import { AdminMfaCodeForm } from "./AdminMfaCodeForm";
import { AdminMfaSetupForm } from "./AdminMfaSetupForm";
import { AdminRecoveryCodesStep } from "./AdminRecoveryCodesStep";
import { STEP_EXPIRED_MESSAGE } from "./admin-auth-errors";

type Etapa =
  | { tipo: "credenciais" }
  | { tipo: "mfa"; mfaToken: string }
  | { tipo: "setup"; setupToken: string }
  | { tipo: "codigos"; codes: string[] };

type Aviso = { tone: "success" | "info"; text: string } | null;

export const INVITE_ACCEPTED_MESSAGE =
  "Senha criada. Entre com seu e-mail e senha para cadastrar a verificação em duas etapas.";

export function AdminLoginFlow() {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>({ tipo: "credenciais" });
  const [aviso, setAviso] = useState<Aviso>(null);
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next"));
    if (params.get("convite") === "aceito") {
      setAviso({ tone: "success", text: INVITE_ACCEPTED_MESSAGE });
      params.delete("convite");
      const qs = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        qs ? `${ADMIN_LOGIN_PATH}?${qs}` : ADMIN_LOGIN_PATH,
      );
    }
  }, []);

  const destino = resolveAdminNext(next);
  const mostrandoCodigos = etapa.tipo === "codigos";

  useEffect(() => {
    if (loading || !admin || mostrandoCodigos) return;
    router.replace(destino);
  }, [loading, admin, mostrandoCodigos, destino, router]);

  const voltarAoInicio = useCallback(() => {
    setAviso(null);
    setEtapa({ tipo: "credenciais" });
  }, []);

  const etapaExpirou = useCallback(() => {
    setAviso({ tone: "info", text: STEP_EXPIRED_MESSAGE });
    setEtapa({ tipo: "credenciais" });
  }, []);

  const onStep = useCallback((step: AdminLoginStep) => {
    setAviso(null);
    setEtapa(
      step.step === "mfa"
        ? { tipo: "mfa", mfaToken: step.mfaToken }
        : { tipo: "setup", setupToken: step.setupToken },
    );
  }, []);

  const onEnabled = useCallback((codes: string[]) => {
    setEtapa({ tipo: "codigos", codes });
  }, []);

  if (loading || (admin && !mostrandoCodigos)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <AdminAuthShell>
      {etapa.tipo === "credenciais" && (
        <AdminCredentialsForm notice={aviso} onStep={onStep} />
      )}
      {etapa.tipo === "mfa" && (
        <AdminMfaCodeForm
          mfaToken={etapa.mfaToken}
          onExpired={etapaExpirou}
          onBack={voltarAoInicio}
        />
      )}
      {etapa.tipo === "setup" && (
        <AdminMfaSetupForm
          setupToken={etapa.setupToken}
          onEnabled={onEnabled}
          onExpired={etapaExpirou}
          onBack={voltarAoInicio}
        />
      )}
      {etapa.tipo === "codigos" && (
        <AdminRecoveryCodesStep
          codes={etapa.codes}
          email={admin?.email}
          onContinue={() => router.replace(destino)}
        />
      )}
    </AdminAuthShell>
  );
}
