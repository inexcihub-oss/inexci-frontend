"use client";

import React, { useState, useEffect } from "react";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";
import { CreateProcedureModal } from "./CreateProcedureModal";
import { CreatePatientModal } from "./CreatePatientModal";
import { CreateHospitalModal } from "./CreateHospitalModal";
import { CreateHealthPlanModal } from "./CreateHealthPlanModal";
import { CreateManagerModal } from "./CreateManagerModal";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { getApiErrorMessage } from "@/lib/http-error";
import {
  surgeryRequestService,
  SimpleSurgeryRequestPayload,
  SurgeryRequestTemplate,
} from "@/services/surgery-request.service";
import { Procedure } from "@/services/procedure.service";
import { Patient } from "@/services/patient.service";
import { Hospital } from "@/services/hospital.service";
import { HealthPlan } from "@/services/health-plan.service";
import { opmeService } from "@/services/opme.service";
import { tussService } from "@/services/tuss.service";
import { User } from "@/types";
import { AvailableDoctor } from "@/types";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { priorityColors } from "@/lib/design-system";
import {
  PriorityLevel,
  PRIORITY,
  PRIORITY_LABELS,
} from "@/types/surgery-request.types";
import {
  ProcedureSelectionContent,
  PatientSelectionContent,
  HospitalSelectionContent,
  HealthPlanSelectionContent,
  DoctorSelectionContent,
  ManagerSelectionContent,
  TemplateSelectionContent,
} from "./wizard-steps/SelectionContents";

interface TemplateOpmeItem {
  name?: string;
  manufacturers?: string[];
  suppliers?: string[];
  quantity?: number;
}

interface TemplateTussItem {
  procedure_id?: string | number;
  tuss_code?: string;
  name?: string;
  quantity?: number;
}

interface CreateSurgeryRequestWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTemplate?: SurgeryRequestTemplate;
}

type ModalState =
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
  | "manager-select"
  | "manager-create"
  | "doctor-select";

export function CreateSurgeryRequestWizard({
  isOpen,
  onClose,
  onSuccess,
  initialTemplate,
}: CreateSurgeryRequestWizardProps) {
  const [modalState, setModalState] = useState<ModalState>("none");
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(onClose);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  // Selected data
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(
    null,
  );
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );
  const [selectedHealthPlan, setSelectedHealthPlan] =
    useState<HealthPlan | null>(null);
  const [selectedManager, setSelectedManager] = useState<User | null>(null);

  // Available doctors — usa React Query para evitar re-fetch a cada abertura do modal
  const { data: availableDoctors = [], isLoading: loadingDoctors } =
    useAvailableDoctors();
  const [selectedDoctor, setSelectedDoctor] = useState<AvailableDoctor | null>(
    null,
  );

  const [priority, setPriority] = useState<PriorityLevel>(PRIORITY.LOW);

  // Template selecionado para pré-popular OPME/TUSS após criação
  const [activeTemplate, setActiveTemplate] =
    useState<SurgeryRequestTemplate | null>(null);

  // Callbacks para adicionar novos itens às listas
  const [addProcedureToList, setAddProcedureToList] = useState<
    ((item: Procedure) => void) | null
  >(null);
  const [addPatientToList, setAddPatientToList] = useState<
    ((item: Patient) => void) | null
  >(null);
  const [addHospitalToList, setAddHospitalToList] = useState<
    ((item: Hospital) => void) | null
  >(null);
  const [addHealthPlanToList, setAddHealthPlanToList] = useState<
    ((item: HealthPlan) => void) | null
  >(null);

  // Auto-selecionar médico único quando o modal abre e só há um disponível
  useEffect(() => {
    if (!isOpen || loadingDoctors) return;
    if (availableDoctors.length === 1) {
      setSelectedDoctor(availableDoctors[0]);
    }
  }, [isOpen, loadingDoctors, availableDoctors]);

  // Aplicar template inicial quando o wizard abre com um template pré-selecionado
  useEffect(() => {
    if (isOpen && initialTemplate) {
      handleTemplateSelected(initialTemplate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTemplate]);

  if (!isOpen) return null;

  const handleProcedureSelected = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setModalState("patient-select");
  };

  const handleProcedureCreated = (procedure: Procedure) => {
    if (addProcedureToList) {
      addProcedureToList(procedure);
    }
    setSelectedProcedure(procedure);
    setModalState("patient-select");
  };

  const handlePatientSelected = (patient: Patient) => {
    setSelectedPatient(patient);
    setModalState("manager-select");
  };

  const handlePatientCreated = (patient: Patient) => {
    if (addPatientToList) {
      addPatientToList(patient);
    }
    setSelectedPatient(patient);
    setModalState("manager-select");
  };

  const handleHospitalSelected = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setModalState("none");
  };

  const handleHospitalCreated = (hospital: Hospital) => {
    if (addHospitalToList) {
      addHospitalToList(hospital);
    }
    setSelectedHospital(hospital);
    setModalState("none");
  };

  const handleHealthPlanSelected = (healthPlan: HealthPlan) => {
    setSelectedHealthPlan(healthPlan);
    setModalState("hospital-select");
  };

  const handleHealthPlanCreated = (healthPlan: HealthPlan) => {
    if (addHealthPlanToList) {
      addHealthPlanToList(healthPlan);
    }
    setSelectedHealthPlan(healthPlan);
    setModalState("hospital-select");
  };

  const handleManagerSelected = (manager: User) => {
    setSelectedManager(manager);
    setModalState("doctor-select");
  };

  const handleDoctorSelected = (doctor: AvailableDoctor) => {
    setSelectedDoctor(doctor);
    setModalState("healthplan-select");
  };

  const handleManagerCreated = (manager: User) => {
    setSelectedManager(manager);
    setModalState("doctor-select");
  };

  const handleTemplateSelected = (template: SurgeryRequestTemplate) => {
    const data = (template.template_data || {}) as Record<string, unknown> & {
      procedure?: { id?: string } & Record<string, unknown>;
      hospital?: unknown;
      hospital_id?: string;
      health_plan?: unknown;
      health_plan_id?: string;
    };
    setActiveTemplate(template);
    // Pré-preencher procedimento (da tabela procedure)
    if (data.procedure?.id) {
      setSelectedProcedure(data.procedure as unknown as Procedure);
    }
    // Pré-preencher hospital (objeto completo salvo no template)
    if (data.hospital) {
      setSelectedHospital(data.hospital as unknown as Hospital);
    } else if (data.hospital_id) {
      setSelectedHospital({
        id: data.hospital_id,
        name: "Hospital do modelo",
      } as unknown as Hospital);
    }
    // Pré-preencher convênio (objeto completo salvo no template)
    if (data.health_plan) {
      setSelectedHealthPlan(data.health_plan as unknown as HealthPlan);
    } else if (data.health_plan_id) {
      setSelectedHealthPlan({
        id: data.health_plan_id,
        name: "Convênio do modelo",
      } as unknown as HealthPlan);
    }
    // Navegar para seleção de paciente (deve ser preenchido manualmente)
    setModalState("patient-select");
  };

  const handleSubmit = async () => {
    // Validar todos os campos obrigatórios para criar a solicitação
    if (
      !selectedDoctor ||
      !selectedPatient ||
      !selectedManager ||
      !selectedProcedure
    ) {
      setToast({
        message:
          "Por favor, preencha todos os campos obrigatórios: Médico, Paciente, Gestor e Procedimento.",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      // Criar payload simplificado com apenas IDs
      const templateData = activeTemplate?.template_data;
      const payload: SimpleSurgeryRequestPayload = {
        procedure_id: selectedProcedure.id,
        patient_id: selectedPatient.id,
        manager_id: selectedManager.id,
        doctor_id: selectedDoctor.id,
        health_plan_id: selectedHealthPlan?.id,
        hospital_id: selectedHospital?.id,
        priority: priority,
        required_documents:
          Array.isArray(templateData?.required_documents) &&
          templateData.required_documents.length
            ? (templateData.required_documents as {
                type: string;
                name: string;
              }[])
            : undefined,
      };

      const newRequest = await surgeryRequestService.createSimple(payload);

      // Pré-popular OPME e TUSS do template, se existirem
      if (templateData) {
        const requestId = newRequest.id;

        if (requestId) {
          // Adicionar OPME
          const opmeItems =
            (templateData.opme_items as TemplateOpmeItem[] | undefined) || [];
          let opmeCreated = 0;
          for (const item of opmeItems) {
            try {
              await opmeService.create({
                surgery_request_id: requestId,
                name: item.name ?? "",
                brand:
                  (item.manufacturers || [])
                    .filter((m: string) => m?.trim())
                    .join(", ") || undefined,
                distributor:
                  (item.suppliers || [])
                    .filter((s: string) => s?.trim())
                    .join(", ") || undefined,
                quantity: item.quantity || 1,
              });
              opmeCreated++;
            } catch (e) {
              console.warn("Erro ao adicionar OPME do template:", e);
            }
          }

          // Se OPME foi adicionado, marcar has_opme = true para resolver a pendência
          if (opmeCreated > 0) {
            try {
              await surgeryRequestService.setHasOpme(String(requestId), true);
            } catch (e) {
              console.warn("Erro ao marcar has_opme:", e);
            }
          }

          // Adicionar TUSS
          const tussItems =
            (templateData.tuss_items as TemplateTussItem[] | undefined) || [];
          if (tussItems.length > 0) {
            try {
              await tussService.addProcedures({
                surgery_request_id: requestId,
                procedures: tussItems.map((item) => ({
                  procedure_id: String(
                    item.procedure_id || item.tuss_code || "",
                  ),
                  tuss_code: item.tuss_code ?? "",
                  name: item.name ?? "",
                  quantity: item.quantity || 1,
                })),
              });
            } catch (e) {
              console.warn("Erro ao adicionar TUSS do template:", e);
            }
          }
        }
      }

      setLoading(false);
      handleClose();
      onSuccess();

      // Mostrar toast após fechar o modal
      setTimeout(() => {
        setToast({
          message: "Solicitação cirúrgica criada com sucesso!",
          type: "success",
        });
      }, 100);
    } catch (error: unknown) {
      setToast({
        message: `Erro ao criar solicitação: ${getApiErrorMessage(error, "Erro desconhecido ao criar solicitação cirúrgica")}`,
        type: "error",
      });
      setLoading(false);
    }
  };

  const handleClose = () => {
    setModalState("none");
    setSelectedProcedure(null);
    setSelectedPatient(null);
    setSelectedHospital(null);
    setSelectedHealthPlan(null);
    setSelectedManager(null);
    setSelectedDoctor(null);
    setPriority(PRIORITY.LOW);
    setActiveTemplate(null);
    onClose();
  };

  // No mobile, quando um painel de seleção está ativo, oculta o formulário principal
  const isSelectionOpen = modalState !== "none";
  const selectionTitle: Record<string, string> = {
    "template-select": "Usar modelo",
    "procedure-select": "Procedimento",
    "patient-select": "Paciente",
    "manager-select": "Gestor",
    "doctor-select": "Médico",
    "healthplan-select": "Convênio",
    "hospital-select": "Hospital",
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={handleClose}
        />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl">
              <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-semibold text-gray-900">
                Criando solicitação...
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                Por favor, aguarde
              </p>
            </div>
          </div>
        )}

        <div
          className="relative bg-white w-full rounded-t-3xl sm:rounded-2xl shadow-xl max-w-4xl overflow-hidden flex flex-col max-h-[85vh] sm:h-[80vh] sm:max-h-[700px] animate-slide-up sm:animate-scale-in mobile-sheet-offset"
          style={
            dragY > 0
              ? { transform: `translateY(${dragY}px)`, transition: "none" }
              : undefined
          }
        >
          {/* Drag handle — apenas mobile */}
          <div
            className="flex sm:hidden justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="w-10 h-1 bg-neutral-200 rounded-full" />
          </div>
          {/* ── LAYOUT PRINCIPAL ── */}
          <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">
            {/* LEFT PANEL — formulário (no mobile, fica oculto quando um painel de seleção está aberto) */}
            <div
              className={`w-full sm:w-3/5 flex flex-col bg-white sm:border-r border-gray-200 ${isSelectionOpen ? "hidden sm:flex" : "flex"}`}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900">
                  Nova solicitação
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalState("template-select")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                      modalState === "template-select"
                        ? "bg-teal-50 text-teal-700 border-teal-300"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0120 8.414V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                      />
                    </svg>
                    Usar modelo
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="sm:hidden text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Fechar"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="flex-1 overflow-y-auto">
                {/* Procedimento */}
                <button
                  onClick={() => setModalState("procedure-select")}
                  className={`w-full min-h-[60px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${modalState === "procedure-select" ? "bg-gray-50" : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-gray-900">
                      Procedimento
                    </span>
                    {selectedProcedure && (
                      <span className="text-xs text-teal-600 font-medium truncate max-w-[200px]">
                        {selectedProcedure.name}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 ml-3">
                    {!selectedProcedure && (
                      <span className="text-xs text-gray-400">Selecionar</span>
                    )}
                    {selectedProcedure ? (
                      <svg
                        className="w-5 h-5 text-teal-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </span>
                </button>

                {/* Paciente */}
                <button
                  disabled={!selectedProcedure}
                  onClick={() =>
                    selectedProcedure && setModalState("patient-select")
                  }
                  className={`w-full min-h-[60px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${!selectedProcedure ? "opacity-40 cursor-not-allowed" : modalState === "patient-select" ? "bg-gray-50" : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-gray-900">
                      Paciente
                    </span>
                    {selectedPatient && (
                      <span className="text-xs text-teal-600 font-medium truncate max-w-[200px]">
                        {selectedPatient.name}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 ml-3">
                    {!selectedPatient && (
                      <span className="text-xs text-gray-400">Selecionar</span>
                    )}
                    {selectedPatient ? (
                      <svg
                        className="w-5 h-5 text-teal-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </span>
                </button>

                {/* Gestor */}
                <button
                  disabled={!selectedPatient}
                  onClick={() =>
                    selectedPatient && setModalState("manager-select")
                  }
                  className={`w-full min-h-[60px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${!selectedPatient ? "opacity-40 cursor-not-allowed" : modalState === "manager-select" ? "bg-gray-50" : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-gray-900">
                      Gestor
                    </span>
                    {selectedManager && (
                      <span className="text-xs text-teal-600 font-medium truncate max-w-[200px]">
                        {selectedManager.name}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 ml-3">
                    {!selectedManager && (
                      <span className="text-xs text-gray-400">Selecionar</span>
                    )}
                    {selectedManager ? (
                      <svg
                        className="w-5 h-5 text-teal-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </span>
                </button>

                {/* Médico */}
                <button
                  disabled={!selectedManager}
                  onClick={() =>
                    selectedManager && setModalState("doctor-select")
                  }
                  className={`w-full min-h-[60px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${!selectedManager ? "opacity-40 cursor-not-allowed" : modalState === "doctor-select" ? "bg-gray-50" : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-gray-900">
                      Médico
                    </span>
                    {selectedDoctor && (
                      <span className="text-xs text-teal-600 font-medium truncate max-w-[200px]">
                        {selectedDoctor.name}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 ml-3">
                    {!selectedDoctor && (
                      <span className="text-xs text-gray-400">Selecionar</span>
                    )}
                    {selectedDoctor ? (
                      <svg
                        className="w-5 h-5 text-teal-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </span>
                </button>

                {/* Convênio - OPCIONAL */}
                <button
                  disabled={!selectedDoctor}
                  onClick={() =>
                    selectedDoctor && setModalState("healthplan-select")
                  }
                  className={`w-full min-h-[60px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${!selectedDoctor ? "opacity-40 cursor-not-allowed" : modalState === "healthplan-select" ? "bg-gray-50" : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-gray-900">
                      Convênio{" "}
                      <span className="text-gray-400 text-[11px] font-normal">
                        (opcional)
                      </span>
                    </span>
                    {selectedHealthPlan && (
                      <span className="text-xs text-teal-600 font-medium truncate max-w-[200px]">
                        {selectedHealthPlan.name}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 ml-3">
                    {selectedHealthPlan ? (
                      <>
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHealthPlan(null);
                          }}
                          className="p-0.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </span>
                        <svg
                          className="w-5 h-5 text-teal-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400">
                          Selecionar
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </>
                    )}
                  </span>
                </button>

                {/* Hospital - OPCIONAL */}
                <button
                  disabled={!selectedDoctor}
                  onClick={() =>
                    selectedDoctor && setModalState("hospital-select")
                  }
                  className={`w-full min-h-[60px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${!selectedDoctor ? "opacity-40 cursor-not-allowed" : modalState === "hospital-select" ? "bg-gray-50" : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-gray-900">
                      Hospital{" "}
                      <span className="text-gray-400 text-[11px] font-normal">
                        (opcional)
                      </span>
                    </span>
                    {selectedHospital && (
                      <span className="text-xs text-teal-600 font-medium truncate max-w-[200px]">
                        {selectedHospital.name}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 ml-3">
                    {selectedHospital ? (
                      <>
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHospital(null);
                          }}
                          className="p-0.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </span>
                        <svg
                          className="w-5 h-5 text-teal-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400">
                          Selecionar
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(
                      [
                        PRIORITY.LOW,
                        PRIORITY.MEDIUM,
                        PRIORITY.HIGH,
                        PRIORITY.URGENT,
                      ] as PriorityLevel[]
                    ).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${priority === p ? "shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                        style={
                          priority === p
                            ? {
                                backgroundColor: priorityColors[p].bg,
                                color: priorityColors[p].text,
                              }
                            : {}
                        }
                      >
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={
                      loading ||
                      isClosing ||
                      !selectedDoctor ||
                      !selectedPatient ||
                      !selectedManager ||
                      !selectedProcedure
                    }
                    className="w-full px-6 py-3.5 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-sm"
                  >
                    {loading
                      ? "Criando..."
                      : isClosing
                        ? "Salvando..."
                        : "Nova solicitação"}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL — painel de seleção (no mobile, ocupa tela inteira quando ativo) */}
            <div
              className={`w-full sm:w-2/5 bg-white flex flex-col min-h-0 flex-1 ${isSelectionOpen ? "flex" : "hidden sm:flex"}`}
            >
              {/* Header do painel de seleção */}
              <div className="px-4 py-3 md:px-5 md:py-4 border-b border-gray-200 flex items-center gap-3 flex-shrink-0 min-h-[57px]">
                {/* Botão voltar — apenas mobile */}
                <button
                  onClick={() => setModalState("none")}
                  className="sm:hidden w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
                >
                  <svg
                    className="w-5 h-5 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h3 className="text-sm md:text-base font-semibold text-gray-900 flex-1">
                  {selectionTitle[modalState] ?? ""}
                </h3>
                {/* Fechar — apenas desktop */}
                <button
                  onClick={handleClose}
                  className="hidden sm:flex p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {modalState === "none" && (
                  <div className="flex items-center justify-center h-full text-gray-300">
                    <p className="text-sm">Selecione um campo ao lado</p>
                  </div>
                )}
                {modalState === "template-select" && (
                  <TemplateSelectionContent
                    onSelect={handleTemplateSelected}
                    isActive={modalState === "template-select"}
                  />
                )}
                {modalState === "procedure-select" && (
                  <ProcedureSelectionContent
                    onSelect={handleProcedureSelected}
                    onCreateNew={() => setModalState("procedure-create")}
                    onNewItemCreated={(callback: (item: Procedure) => void) => {
                      setAddProcedureToList(() => callback);
                    }}
                    selectedItemId={selectedProcedure?.id}
                    isActive={modalState === "procedure-select"}
                  />
                )}
                {modalState === "patient-select" && (
                  <PatientSelectionContent
                    onSelect={handlePatientSelected}
                    onCreateNew={() => setModalState("patient-create")}
                    onNewItemCreated={(callback: (item: Patient) => void) => {
                      setAddPatientToList(() => callback);
                    }}
                    selectedItemId={selectedPatient?.id}
                    isActive={modalState === "patient-select"}
                  />
                )}
                {modalState === "hospital-select" && (
                  <HospitalSelectionContent
                    onSelect={handleHospitalSelected}
                    onDeselect={() => setSelectedHospital(null)}
                    onCreateNew={() => setModalState("hospital-create")}
                    onNewItemCreated={(callback: (item: Hospital) => void) => {
                      setAddHospitalToList(() => callback);
                    }}
                    selectedItemId={selectedHospital?.id}
                    isActive={modalState === "hospital-select"}
                  />
                )}
                {modalState === "healthplan-select" && (
                  <HealthPlanSelectionContent
                    onSelect={handleHealthPlanSelected}
                    onDeselect={() => setSelectedHealthPlan(null)}
                    onCreateNew={() => setModalState("healthplan-create")}
                    onNewItemCreated={(
                      callback: (item: HealthPlan) => void,
                    ) => {
                      setAddHealthPlanToList(() => callback);
                    }}
                    selectedItemId={selectedHealthPlan?.id}
                    isActive={modalState === "healthplan-select"}
                  />
                )}
                {modalState === "manager-select" && (
                  <ManagerSelectionContent
                    onSelect={handleManagerSelected}
                    onCreateNew={() => setModalState("manager-create")}
                    selectedItemId={selectedManager?.id}
                    isActive={modalState === "manager-select"}
                  />
                )}
                {modalState === "doctor-select" && (
                  <DoctorSelectionContent
                    onSelect={handleDoctorSelected}
                    availableDoctors={availableDoctors}
                    loadingDoctors={loadingDoctors}
                    selectedItemId={selectedDoctor?.id}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals for Creating New Items */}
      <CreateProcedureModal
        isOpen={modalState === "procedure-create"}
        onClose={() => setModalState("procedure-select")}
        onSuccess={handleProcedureCreated}
      />

      <CreatePatientModal
        isOpen={modalState === "patient-create"}
        onClose={() => setModalState("patient-select")}
        onSuccess={handlePatientCreated}
      />

      <CreateHospitalModal
        isOpen={modalState === "hospital-create"}
        onClose={() => setModalState("hospital-select")}
        onSuccess={handleHospitalCreated}
      />

      <CreateHealthPlanModal
        isOpen={modalState === "healthplan-create"}
        onClose={() => setModalState("healthplan-select")}
        onSuccess={handleHealthPlanCreated}
      />

      <CreateManagerModal
        isOpen={modalState === "manager-create"}
        onClose={() => setModalState("manager-select")}
        onSuccess={handleManagerCreated}
      />
    </>
  );
}
