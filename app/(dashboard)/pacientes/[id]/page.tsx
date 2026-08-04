"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import { DetailPageLayout, FormSection } from "@/components/details";
import { Spinner } from "@/components/ui";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { patientService, Patient } from "@/services/patient.service";
import { PatientRegistrationForm } from "@/components/patients/PatientRegistrationForm";
import { PatientClinicalTimeline } from "@/components/clinical/PatientClinicalTimeline";
import { PatientDocuments } from "@/components/clinical/PatientDocuments";
import { PatientTimelineSidebar } from "@/components/clinical/PatientTimelineSidebar";
import { NewAppointmentModal } from "@/components/agenda/NewAppointmentModal";
import {
  surgeryRequestService,
  SurgeryRequestListItem,
} from "@/services/surgery-request.service";
import { appointmentService, Appointment } from "@/services/appointment.service";
import { logger } from "@/lib/logger";
import { resolverReturnUrl } from "@/lib/safe-return-url";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { Plus } from "lucide-react";

export default function PacienteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get("returnUrl");
  const returnUrl = (() => {
    if (!rawReturnUrl) return null;
    if (typeof window === "undefined") return null;
    const decoded = decodeURIComponent(rawReturnUrl);
    return resolverReturnUrl(decoded, window.location.origin);
  })();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [surgeryRequests, setSurgeryRequests] = useState<
    SurgeryRequestListItem[]
  >([]);
  const [loadingSurgeries, setLoadingSurgeries] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const { can } = useAuth();
  const podeAgenda = can(Permission.AGENDA);
  // Prontuário e documentos exigem Atendimento no backend (`ATENDIMENTO`
  // na classe de `clinical-records` e `clinical-records/documents`,
  // inclusive no GET) — sem a permissão não há nada legítimo para buscar,
  // então a seção nem monta.
  const podeAtendimento = can(Permission.ATENDIMENTO);

  /** Consultas do paciente — vive na página porque o botão "Nova consulta"
   * também está aqui; a sidebar apenas consome e pede recarga. */
  const loadAppointments = useCallback(() => {
    setLoadingAppointments(true);
    appointmentService
      .getByPatient(params.id)
      .then(setAppointments)
      .catch(() => setAppointments([]))
      .finally(() => setLoadingAppointments(false));
  }, [params.id]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const loadData = async () => {
    setLoading(true);
    setLoadingSurgeries(true);
    try {
      const [patientData, surgeryData] = await Promise.all([
        patientService.getById(params.id),
        surgeryRequestService
          .getAll({ patientId: params.id })
          .catch(() => ({ total: 0, records: [] })),
      ]);

      if (!patientData) {
        logger.error("Paciente não encontrado");
        setLoading(false);
        setLoadingSurgeries(false);
        return;
      }

      setPatient(patientData);
      setSurgeryRequests(surgeryData.records ?? []);
    } catch (error) {
      logger.error("Erro ao carregar paciente:", error);
    } finally {
      setLoading(false);
      setLoadingSurgeries(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (!patient) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Paciente não encontrado.</p>
        </div>
      </PageContainer>
    );
  }

  const sidebarContent = (
    <PatientTimelineSidebar
      appointments={appointments}
      loadingAppointments={loadingAppointments}
      surgeries={surgeryRequests}
      loadingSurgeries={loadingSurgeries}
      onReload={loadAppointments}
    />
  );

  return (
    <PageContainer>
      <DetailPageLayout
        sectionTitle="Pacientes"
        backHref="/pacientes"
        itemName={patient.name}
        itemSubtitle="Paciente"
        sidebarIcon="calendar"
        sidebarContent={sidebarContent}
      >
        {/* Ação principal do paciente */}
        {podeAgenda && (
          <div className="flex justify-end">
            <button
              onClick={() => setIsNewAppointmentOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" strokeWidth={2.2} />
              <span className="text-xs font-semibold">Nova consulta</span>
            </button>
          </div>
        )}

        {/* Seção: Prontuário — some inteira sem Atendimento, em vez de
            mostrar um título com nada embaixo. */}
        {podeAtendimento && (
          <FormSection title="Prontuário">
            <PatientClinicalTimeline patientId={patient.id} />
          </FormSection>
        )}

        {/* Seção: Documentos e exames (card próprio, com ação no header).
            O componente já se esconde sozinho sem Atendimento. */}
        <PatientDocuments patientId={patient.id} />

        <PatientRegistrationForm
          patient={patient}
          onSaved={(saved) => {
            setPatient(saved);
            showToast("Paciente atualizado com sucesso!", "success");
            if (returnUrl) {
              setTimeout(() => router.push(returnUrl), 800);
            }
          }}
          onCancel={() => router.push(returnUrl ?? "/pacientes")}
        />
      </DetailPageLayout>

      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => setIsNewAppointmentOpen(false)}
        onSaved={loadAppointments}
        defaultPatientId={patient.id}
        defaultPatientLabel={patient.name}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as ToastType}
          onClose={hideToast}
        />
      )}
    </PageContainer>
  );
}
