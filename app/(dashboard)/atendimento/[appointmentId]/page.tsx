"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { Spinner } from "@/components/ui";
import { AtendimentoTabs } from "@/components/clinical/AtendimentoTabs";
import { appointmentService, Appointment } from "@/services/appointment.service";
import { patientService, Patient } from "@/services/patient.service";
import {
  clinicalRecordService,
  ClinicalRecord,
} from "@/services/clinical-record.service";
import { logger } from "@/lib/logger";

export default function AtendimentoPage() {
  const params = useParams<{ appointmentId: string }>();

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [record, setRecord] = useState<ClinicalRecord | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const appt = await appointmentService.getById(params.appointmentId);
        if (!active) return;
        setAppointment(appt);
        const [pat, existing] = await Promise.all([
          patientService.getById(appt.patientId),
          clinicalRecordService.getByAppointment(params.appointmentId),
        ]);
        if (!active) return;
        setPatient(pat);
        setRecord(existing);
      } catch (err) {
        logger.error("Erro ao carregar atendimento:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.appointmentId]);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (!appointment || !patient) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Atendimento não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AtendimentoTabs
        patient={patient}
        appointment={appointment}
        initialRecord={record}
      />
    </PageContainer>
  );
}
