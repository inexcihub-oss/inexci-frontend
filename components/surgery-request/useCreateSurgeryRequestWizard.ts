"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/http-error";
import {
  surgeryRequestService,
  SimpleSurgeryRequestPayload,
  SurgeryRequestTemplateSummary,
} from "@/services/surgery-request.service";
import { logger } from "@/lib/logger";
import { Procedure } from "@/services/procedure.service";
import { PatientListItem } from "@/services/patient.service";
import { Hospital } from "@/services/hospital.service";
import { HealthPlan } from "@/services/health-plan.service";
import { opmeService } from "@/services/opme.service";
import { extractTemplateOpmeItemsForCreate } from "@/components/procedures/normalize-template-opme";
import { extractTemplateTussItemsForCreate } from "@/components/procedures/normalize-template-tuss";
import { tussService } from "@/services/tuss.service";
import { AvailableDoctor } from "@/types";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { canOwnSurgeryRequest } from "@/lib/professional-council";
import { useOnboardingAction } from "@/components/onboarding/useOnboardingAction";
import { PriorityLevel, PRIORITY } from "@/types/surgery-request.types";

export type WizardPanel =
  | "none"
  | "template-select"
  | "procedure-select"
  | "procedure-create"
  | "patient-select"
  | "patient-create"
  | "hospital-select"
  | "hospital-create"
  | "healthplan-select"
  | "healthplan-create"
  | "doctor-select";

export const WIZARD_PANEL_TITLES: Partial<Record<WizardPanel, string>> = {
  "template-select": "Usar modelo",
  "procedure-select": "Procedimento",
  "patient-select": "Paciente",
  "doctor-select": "Médico",
  "healthplan-select": "Convênio",
  "hospital-select": "Hospital",
};

interface UseCreateSurgeryRequestWizardParams {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTemplate?: SurgeryRequestTemplateSummary | null;
}

type AddToList<T> = ((item: T) => void) | null;

async function copyTemplateItems(
  requestId: string | number,
  templateData: Record<string, unknown>,
): Promise<string[]> {
  const avisos: string[] = [];

  const opmeItems = extractTemplateOpmeItemsForCreate(templateData);
  let opmeCreated = 0;
  let opmeFalhou = 0;
  for (const item of opmeItems) {
    try {
      await opmeService.create({
        surgeryRequestId: requestId,
        name: item.name,
        manufacturerIds:
          item.manufacturerIds.length > 0 ? item.manufacturerIds : undefined,
        manufacturerNames:
          item.manufacturerNames.length > 0
            ? item.manufacturerNames
            : undefined,
        supplierIds: item.supplierIds.length > 0 ? item.supplierIds : undefined,
        supplierNames:
          item.supplierNames.length > 0 ? item.supplierNames : undefined,
        quantity: item.quantity,
      });
      opmeCreated++;
    } catch (e) {
      logger.warn("Erro ao adicionar OPME do template:", e);
      opmeFalhou++;
    }
  }

  if (opmeFalhou > 0) {
    avisos.push(`${opmeFalhou} item(ns) OPME do modelo não foram copiados`);
  }

  if (opmeCreated > 0) {
    try {
      await surgeryRequestService.setHasOpme(String(requestId), true);
    } catch (e) {
      logger.warn("Erro ao marcar has_opme:", e);
    }
  }

  const { items: tussItems, duplicadosIgnorados } =
    extractTemplateTussItemsForCreate(templateData);

  if (duplicadosIgnorados.length > 0) {
    avisos.push(
      `TUSS com código repetido não copiado(s): ${duplicadosIgnorados.join(", ")}`,
    );
  }

  if (tussItems.length > 0) {
    try {
      await tussService.addProcedures({
        surgeryRequestId: requestId,
        procedures: tussItems,
      });
    } catch (e) {
      logger.warn("Erro ao adicionar TUSS do template:", e);
      avisos.push(
        `códigos TUSS do modelo não copiados (${getApiErrorMessage(e, "erro desconhecido")})`,
      );
    }
  }

  return avisos;
}

export function useCreateSurgeryRequestWizard({
  isOpen,
  onClose,
  onSuccess,
  initialTemplate,
}: UseCreateSurgeryRequestWizardParams) {
  const { showToast } = useToast();
  const [panel, setPanel] = useState<WizardPanel>("none");
  const [loading, setLoading] = useState(false);

  useOnboardingAction("sc-abrir-selecao-procedimento", () =>
    setPanel("procedure-select"),
  );

  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(
    null,
  );
  const [selectedPatient, setSelectedPatient] =
    useState<PatientListItem | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );
  const [selectedHealthPlan, setSelectedHealthPlan] =
    useState<HealthPlan | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<AvailableDoctor | null>(
    null,
  );
  const [priority, setPriority] = useState<PriorityLevel>(PRIORITY.LOW);
  const [activeTemplate, setActiveTemplate] =
    useState<SurgeryRequestTemplateSummary | null>(null);

  const [addProcedureToList, setAddProcedureToList] =
    useState<AddToList<Procedure>>(null);
  const [addPatientToList, setAddPatientToList] =
    useState<AddToList<PatientListItem>>(null);
  const [addHospitalToList, setAddHospitalToList] =
    useState<AddToList<Hospital>>(null);
  const [addHealthPlanToList, setAddHealthPlanToList] =
    useState<AddToList<HealthPlan>>(null);

  const { data: allDoctors = [], isLoading: loadingDoctors } =
    useAvailableDoctors({ fresh: true });
  const availableDoctors = useMemo(
    () => allDoctors.filter(canOwnSurgeryRequest),
    [allDoctors],
  );

  const selectTemplate = (template: SurgeryRequestTemplateSummary) => {
    setActiveTemplate(template);

    if (template.procedureId && template.procedureName) {
      setSelectedProcedure({
        id: template.procedureId,
        name: template.procedureName,
      } as Procedure);
    }
    if (template.hospitalId && template.hospitalName) {
      setSelectedHospital({
        id: template.hospitalId,
        name: template.hospitalName,
      } as Hospital);
    }
    if (template.healthPlanId && template.healthPlanName) {
      setSelectedHealthPlan({
        id: template.healthPlanId,
        name: template.healthPlanName,
      } as HealthPlan);
    }
    if (template.priority) {
      setPriority(template.priority as PriorityLevel);
    }

    setPanel("patient-select");
  };

  useEffect(() => {
    if (!isOpen || loadingDoctors) return;
    if (availableDoctors.length === 1) {
      setSelectedDoctor(availableDoctors[0]);
    }
  }, [isOpen, loadingDoctors, availableDoctors]);

  useEffect(() => {
    if (isOpen && initialTemplate) {
      selectTemplate(initialTemplate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTemplate]);

  const selectProcedure = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setPanel("patient-select");
  };

  const procedureCreated = (procedure: Procedure) => {
    addProcedureToList?.(procedure);
    selectProcedure(procedure);
  };

  const procedureDeleted = (deletedId: string) => {
    if (selectedProcedure?.id !== deletedId) return;
    setSelectedProcedure(null);
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedHealthPlan(null);
    setSelectedHospital(null);
    setPanel("procedure-select");
  };

  const selectPatient = (patient: PatientListItem) => {
    setSelectedPatient(patient);
    setPanel("doctor-select");
  };

  const patientCreated = (patient: PatientListItem) => {
    addPatientToList?.(patient);
    selectPatient(patient);
  };

  const selectDoctor = (doctor: AvailableDoctor) => {
    setSelectedDoctor(doctor);
    setPanel("healthplan-select");
  };

  const selectHealthPlan = (healthPlan: HealthPlan) => {
    setSelectedHealthPlan(healthPlan);
    setPanel("hospital-select");
  };

  const healthPlanCreated = (healthPlan: HealthPlan) => {
    addHealthPlanToList?.(healthPlan);
    selectHealthPlan(healthPlan);
  };

  const selectHospital = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setPanel("none");
  };

  const hospitalCreated = (hospital: Hospital) => {
    addHospitalToList?.(hospital);
    selectHospital(hospital);
  };

  const close = () => {
    setPanel("none");
    setSelectedProcedure(null);
    setSelectedPatient(null);
    setSelectedHospital(null);
    setSelectedHealthPlan(null);
    setSelectedDoctor(null);
    setPriority(PRIORITY.LOW);
    setActiveTemplate(null);
    onClose();
  };

  const canSubmit = Boolean(
    selectedDoctor && selectedPatient && selectedProcedure,
  );

  const submit = async () => {
    if (!selectedDoctor || !selectedPatient || !selectedProcedure) {
      showToast(
        "Por favor, preencha todos os campos obrigatórios: Médico, Paciente e Procedimento.",
        "error",
      );
      return;
    }

    setLoading(true);

    try {
      const templateData = activeTemplate
        ? (await surgeryRequestService.getTemplate(activeTemplate.id))
            .templateData
        : undefined;

      const payload: SimpleSurgeryRequestPayload = {
        procedureId: selectedProcedure.id,
        patientId: selectedPatient.id,
        doctorId: selectedDoctor.id,
        healthPlanId: selectedHealthPlan?.id,
        hospitalId: selectedHospital?.id,
        priority,
        requiredDocuments:
          Array.isArray(templateData?.requiredDocuments) &&
          templateData.requiredDocuments.length
            ? (templateData.requiredDocuments as {
                type: string;
                name: string;
              }[])
            : undefined,
      };

      const newRequest = await surgeryRequestService.createSimple(payload);

      const avisos =
        templateData && newRequest.id
          ? await copyTemplateItems(
              newRequest.id,
              (templateData ?? {}) as Record<string, unknown>,
            )
          : [];

      if (activeTemplate?.id) {
        surgeryRequestService
          .incrementTemplateUsage(activeTemplate.id)
          .catch(() => {});
      }

      setLoading(false);
      close();
      onSuccess();

      showToast(
        avisos.length > 0
          ? `Solicitação criada, mas ${avisos.join("; ")} — complete na solicitação.`
          : "Solicitação cirúrgica criada com sucesso!",
        avisos.length > 0 ? "warning" : "success",
      );
    } catch (error: unknown) {
      showToast(
        `Erro ao criar solicitação: ${getApiErrorMessage(error, "Erro desconhecido ao criar solicitação cirúrgica")}`,
        "error",
      );
      setLoading(false);
    }
  };

  return {
    panel,
    openPanel: setPanel,
    loading,
    canSubmit,
    priority,
    setPriority,
    activeTemplate,
    availableDoctors,
    loadingDoctors,
    selectedProcedure,
    selectedPatient,
    selectedDoctor,
    selectedHealthPlan,
    selectedHospital,
    clearHealthPlan: () => setSelectedHealthPlan(null),
    clearHospital: () => setSelectedHospital(null),
    selectTemplate,
    selectProcedure,
    procedureCreated,
    procedureDeleted,
    selectPatient,
    patientCreated,
    selectDoctor,
    selectHealthPlan,
    healthPlanCreated,
    selectHospital,
    hospitalCreated,
    registerProcedureAdder: (fn: (item: Procedure) => void) =>
      setAddProcedureToList(() => fn),
    registerPatientAdder: (fn: (item: PatientListItem) => void) =>
      setAddPatientToList(() => fn),
    registerHospitalAdder: (fn: (item: Hospital) => void) =>
      setAddHospitalToList(() => fn),
    registerHealthPlanAdder: (fn: (item: HealthPlan) => void) =>
      setAddHealthPlanToList(() => fn),
    submit,
    close,
  };
}
