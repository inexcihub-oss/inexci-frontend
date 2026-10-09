"use client";

import { useMemo } from "react";
import { Spinner } from "@/components/ui";
import { PatientTimeline } from "@/components/patients/PatientTimeline";
import { usePatientHistory } from "@/components/patients/usePatientHistory";
import { montarHistorico } from "@/lib/patient-history";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";

export function PatientHistoryTab({
  patientId,
  currentAppointmentId,
}: {
  patientId: string;
  currentAppointmentId: string;
}) {
  const { can } = useAuth();
  const { appointments, records, surgeries, documents, profissionais, loading, error, reload } =
    usePatientHistory(patientId);

  const historico = useMemo(
    () =>
      montarHistorico({
        appointments,
        records,
        surgeries,
        excluirConsultaId: currentAppointmentId,
      }),
    [appointments, records, surgeries, currentAppointmentId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-red-600">
          Não foi possível carregar o histórico do paciente.
        </p>
        <button
          onClick={reload}
          className="text-sm font-semibold text-teal-700 hover:underline min-h-[44px] px-3"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <PatientTimeline
      historico={historico}
      documents={documents}
      profissionais={profissionais}
      podeVerSolicitacoes={can(Permission.SOLICITACOES)}
      cirurgiaEmNovaAba
      mensagemVazia="Nenhuma consulta ou cirurgia anterior registrada para este paciente."
    />
  );
}
