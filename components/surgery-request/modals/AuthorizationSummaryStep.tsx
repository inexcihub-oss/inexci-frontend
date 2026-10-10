"use client";

import React from "react";
import { SurgeryRequestDetail } from "@/services/surgery-request.service";
import { describeSelectedSupplier } from "./fornecedor-vencedor";
import { AuthorizationEntry, SummaryTable } from "./AuthorizationTables";

interface AuthorizationSummaryStepProps {
  solicitacao: SurgeryRequestDetail;
  tussAuth: AuthorizationEntry[];
  opmeAuth: AuthorizationEntry[];
  selectedOpmeSuppliers: Record<string, string>;
}

export function AuthorizationSummaryStep({
  solicitacao,
  tussAuth,
  opmeAuth,
  selectedOpmeSuppliers,
}: AuthorizationSummaryStepProps) {
  return (
    <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 overflow-y-auto">
      <div className="flex items-center gap-3 p-3 md:p-4 bg-blue-50 rounded-xl">
        <p className="text-sm md:text-base text-blue-600 leading-normal">
          Revise os itens autorizados pelo convênio e escolha como prosseguir:
          aceite para propor datas de agendamento, conteste se as autorizações
          estiverem incorretas ou encerre a solicitação.
        </p>
      </div>
      {tussAuth.length > 0 && (
        <div className="flex flex-col gap-3 md:gap-4">
          <p className="text-sm md:text-base font-semibold text-gray-900">
            Código TUSS
          </p>
          <SummaryTable
            labelHeader="Procedimento"
            items={tussAuth.map((e) => {
              const proc = solicitacao.tussItems?.find((p) => p.id === e.id);
              return {
                label: `${proc?.tussCode ?? ""} — ${proc?.name ?? ""}`,
                requested: e.quantity,
                authorized:
                  e.authorizedQuantity !== ""
                    ? Number(e.authorizedQuantity)
                    : null,
              };
            })}
          />
        </div>
      )}
      {opmeAuth.length > 0 && (
        <div className="flex flex-col gap-3 md:gap-4">
          <p className="text-sm md:text-base font-semibold text-gray-900">
            OPME
          </p>
          <SummaryTable
            labelHeader="Descrição"
            items={opmeAuth.map((e) => {
              const opme = solicitacao.opmeItems?.find((o) => o.id === e.id);
              return {
                label: opme?.name ?? String(e.id),
                requested: e.quantity,
                authorized:
                  e.authorizedQuantity !== ""
                    ? Number(e.authorizedQuantity)
                    : null,
              };
            })}
          />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-600">
              Fornecedor selecionado
            </p>
            {opmeAuth.map((e) => {
              const opme = solicitacao.opmeItems?.find((o) => o.id === e.id);
              const selectedSupplierLabel = describeSelectedSupplier(
                opme,
                selectedOpmeSuppliers[String(e.id)],
              );

              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 text-xs md:text-sm"
                >
                  <span className="text-gray-500 truncate">
                    {opme?.name ?? String(e.id)}
                  </span>
                  <span className="font-medium text-gray-800">
                    {selectedSupplierLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
