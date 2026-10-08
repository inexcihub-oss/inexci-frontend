"use client";

import { useCallback, useEffect, useState } from "react";
import { appointmentService, Appointment } from "@/services/appointment.service";
import {
  clinicalRecordService,
  ClinicalRecord,
} from "@/services/clinical-record.service";
import {
  surgeryRequestService,
  SurgeryRequestListItem,
} from "@/services/surgery-request.service";
import {
  patientDocumentService,
  PatientDocument,
} from "@/services/document.service";
import { availableDoctorsService } from "@/services/available-doctors.service";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

export interface PatientHistoryData {
  appointments: Appointment[];
  records: ClinicalRecord[];
  surgeries: SurgeryRequestListItem[];
  documents: PatientDocument[];
  /** Nome de cada profissional da conta, pelo id. */
  profissionais: Map<string, string>;
  /** Quem é médico (CRM); ausente na lista = médico, como em `AvailableDoctor`. */
  medicos: Map<string, boolean | undefined>;
}

const VAZIO: PatientHistoryData = {
  appointments: [],
  records: [],
  surgeries: [],
  documents: [],
  profissionais: new Map(),
  medicos: new Map(),
};

/**
 * Tudo que a linha do tempo do paciente precisa, buscado de uma vez.
 *
 * Cada chamada só sai se a permissão que o backend exige estiver presente —
 * senão volta 403 garantido. Consultas e fichas são o núcleo: se falharem, o
 * histórico mostra erro (vazio mentiria). Cirurgias, documentos e nomes dos
 * profissionais são complemento: se falharem, a linha do tempo sai sem eles.
 */
export function usePatientHistory(patientId: string) {
  const { can } = useAuth();
  const podeConsultas = can(Permission.AGENDA) || can(Permission.ATENDIMENTO);
  const podeProntuario = can(Permission.ATENDIMENTO);
  // `GET /surgery-requests` exige SOLICITACOES ou ATENDIMENTO no backend.
  const podeCirurgias =
    can(Permission.SOLICITACOES) || can(Permission.ATENDIMENTO);
  const [data, setData] = useState<PatientHistoryData>(VAZIO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    const complemento = <T,>(promise: Promise<T>, fallback: T, nome: string) =>
      promise.catch((err) => {
        logger.warn(`Erro ao carregar ${nome} do histórico do paciente:`, err);
        return fallback;
      });

    (async () => {
      try {
        const [appointments, records, surgeries, documents, doctors] =
          await Promise.all([
            podeConsultas
              ? appointmentService.getByPatient(patientId)
              : Promise.resolve([] as Appointment[]),
            podeProntuario
              ? clinicalRecordService.getByPatient(patientId)
              : Promise.resolve([] as ClinicalRecord[]),
            podeCirurgias
              ? complemento(
                  surgeryRequestService.getAll({ patientId }),
                  { total: 0, records: [] as SurgeryRequestListItem[] },
                  "cirurgias",
                )
              : Promise.resolve({
                  total: 0,
                  records: [] as SurgeryRequestListItem[],
                }),
            podeProntuario
              ? complemento(
                  patientDocumentService.list(patientId),
                  [] as PatientDocument[],
                  "documentos",
                )
              : Promise.resolve([] as PatientDocument[]),
            complemento(
              availableDoctorsService.getAvailableDoctors(),
              [],
              "profissionais",
            ),
          ]);
        if (!active) return;
        setData({
          appointments,
          records,
          surgeries: surgeries.records ?? [],
          documents,
          profissionais: new Map(
            (doctors ?? []).map((d) => [d.id, d.name] as const),
          ),
          medicos: new Map(
            (doctors ?? []).map((d) => [d.id, d.isPhysician] as const),
          ),
        });
      } catch (err) {
        logger.error("Erro ao carregar histórico do paciente:", err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [patientId, podeConsultas, podeProntuario, podeCirurgias, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return { ...data, loading, error, reload };
}
