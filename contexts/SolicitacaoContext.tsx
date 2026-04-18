"use client";

import { createContext, useContext } from "react";
import { SurgeryRequestDetail } from "@/services/surgery-request.service";

interface SolicitacaoContextValue {
  solicitacao: SurgeryRequestDetail;
  statusNum: number;
  onUpdate: () => void;
}

const SolicitacaoContext = createContext<SolicitacaoContextValue | null>(null);

export function SolicitacaoProvider({
  solicitacao,
  statusNum,
  onUpdate,
  children,
}: SolicitacaoContextValue & { children: React.ReactNode }) {
  return (
    <SolicitacaoContext.Provider value={{ solicitacao, statusNum, onUpdate }}>
      {children}
    </SolicitacaoContext.Provider>
  );
}

export function useSolicitacao(): SolicitacaoContextValue {
  const ctx = useContext(SolicitacaoContext);
  if (!ctx)
    throw new Error(
      "useSolicitacao deve ser usado dentro de SolicitacaoProvider",
    );
  return ctx;
}
