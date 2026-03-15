"use client";

import { useState, useEffect } from "react";
import { CreateProcedureModal } from "./CreateProcedureModal";
import { CreatePatientModal } from "./CreatePatientModal";
import { CreateHospitalModal } from "./CreateHospitalModal";
import { CreateHealthPlanModal } from "./CreateHealthPlanModal";
import { CreateManagerModal } from "./CreateManagerModal";
import { Toast, ToastType } from "@/components/ui/Toast";
import Image from "next/image";
import {
  surgeryRequestService,
  SimpleSurgeryRequestPayload,
} from "@/services/surgery-request.service";
import { Procedure } from "@/services/procedure.service";
import { Patient } from "@/services/patient.service";
import { Hospital } from "@/services/hospital.service";
import { HealthPlan } from "@/services/health-plan.service";
import { User } from "@/services/user.service";
import { priorityColors } from "@/lib/design-system";
import {
  PriorityLevel,
  PRIORITY,
  PRIORITY_LABELS,
} from "@/types/surgery-request.types";

interface CreateSurgeryRequestWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
  | "manager-create";

export function CreateSurgeryRequestWizard({
  isOpen,
  onClose,
  onSuccess,
}: CreateSurgeryRequestWizardProps) {
  const [modalState, setModalState] = useState<ModalState>("none");
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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

  const [priority, setPriority] = useState<PriorityLevel>(PRIORITY.LOW);

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

  if (!isOpen) return null;

  const handleProcedureSelected = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setModalState("none");
  };

  const handleProcedureCreated = (procedure: Procedure) => {
    if (addProcedureToList) {
      addProcedureToList(procedure);
    }
    setSelectedProcedure(procedure);
    setModalState("none");
  };

  const handlePatientSelected = (patient: Patient) => {
    setSelectedPatient(patient);
    setModalState("none");
  };

  const handlePatientCreated = (patient: Patient) => {
    if (addPatientToList) {
      addPatientToList(patient);
    }
    setSelectedPatient(patient);
    setModalState("none");
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
    setModalState("none");
  };

  const handleHealthPlanCreated = (healthPlan: HealthPlan) => {
    if (addHealthPlanToList) {
      addHealthPlanToList(healthPlan);
    }
    setSelectedHealthPlan(healthPlan);
    setModalState("none");
  };

  const handleManagerSelected = (manager: User) => {
    setSelectedManager(manager);
    setModalState("none");
  };

  const handleManagerCreated = (manager: User) => {
    setSelectedManager(manager);
    setModalState("none");
  };

  const handleTemplateSelected = (template: any) => {
    const data = template.template_data || {};
    // Pré-preencher procedimento (primeiro da lista)
    if (data.procedures?.length > 0) {
      setSelectedProcedure(data.procedures[0]);
    }
    // Pré-preencher hospital (objeto completo salvo no template)
    if (data.hospital) {
      setSelectedHospital(data.hospital);
    } else if (data.hospital_id) {
      setSelectedHospital({
        id: data.hospital_id,
        name: "Hospital do modelo",
      } as any);
    }
    // Pré-preencher convênio (objeto completo salvo no template)
    if (data.health_plan) {
      setSelectedHealthPlan(data.health_plan);
    } else if (data.health_plan_id) {
      setSelectedHealthPlan({
        id: data.health_plan_id,
        name: "Convênio do modelo",
      } as any);
    }
    // Navegar para seleção de paciente (deve ser preenchido manualmente)
    setModalState("patient-select");
  };

  const handleSubmit = async () => {
    // Validar todos os campos obrigatórios para criar a solicitação
    if (!selectedPatient || !selectedManager || !selectedProcedure) {
      setToast({
        message:
          "Por favor, preencha todos os campos obrigatórios: Paciente, Gestor e Procedimento.",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      // Criar payload simplificado com apenas IDs
      const payload: SimpleSurgeryRequestPayload = {
        procedure_id: selectedProcedure.id,
        patient_id: selectedPatient.id,
        manager_id: selectedManager.id,
        health_plan_id: selectedHealthPlan?.id,
        hospital_id: selectedHospital?.id,
        priority: priority,
      };

      await surgeryRequestService.createSimple(payload);

      setToast({
        message: "Solicitação cirúrgica criada com sucesso!",
        type: "success",
      });

      setLoading(false);
      setIsClosing(true);

      // Aguardar um pouco para mostrar o toast antes de fechar
      setTimeout(() => {
        setIsClosing(false);
        handleClose();
        onSuccess();
      }, 1500);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Erro desconhecido ao criar solicitação cirúrgica";
      setToast({
        message: `Erro ao criar solicitação: ${errorMessage}`,
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
    setPriority(PRIORITY.LOW);
    onClose();
  };

  // No mobile, quando um painel de seleção está ativo, oculta o formulário principal
  const isSelectionOpen = modalState !== "none";
  const selectionTitle: Record<string, string> = {
    "template-select": "Usar modelo",
    "procedure-select": "Procedimento",
    "patient-select": "Paciente",
    "manager-select": "Gestor",
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl">
              <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-semibold text-gray-900">
                Criando solicitação...
              </p>
              <p className="text-sm text-gray-500">Por favor, aguarde</p>
            </div>
          </div>
        )}

        <div className="relative bg-white w-full rounded-2xl shadow-xl max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* ── LAYOUT PRINCIPAL ── */}
          <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">
            {/* LEFT PANEL — formulário (no mobile, fica oculto quando um painel de seleção está aberto) */}
            <div
              className={`w-full sm:w-3/5 flex flex-col bg-white sm:border-r border-gray-200 ${isSelectionOpen ? "hidden sm:flex" : "flex"}`}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">
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
              </div>

              {/* Form Fields */}
              <div className="flex-1 overflow-y-auto">
                {/* Procedimento */}
                <button
                  onClick={() => setModalState("procedure-select")}
                  className={`w-full min-h-[72px] px-5 flex items-center justify-between text-left hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 ${modalState === "procedure-select" ? "bg-gray-50" : ""}`}
                >
                  <span
                    className={`text-base font-semibold ${selectedProcedure ? "text-gray-900" : "text-gray-900"}`}
                  >
                    Procedimento
                  </span>
                  <span className="flex items-center gap-2 min-w-0 ml-3">
                    <span
                      className={`text-sm truncate max-w-[140px] ${selectedProcedure ? "text-teal-700 font-medium" : "text-gray-400"}`}
                    >
                      {selectedProcedure
                        ? selectedProcedure.name
                        : "Selecionar"}
                    </span>
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
                  </span>
                </button>

                {/* Paciente */}
                <button
                  disabled={!selectedProcedure}
                  onClick={() =>
                    selectedProcedure && setModalState("patient-select")
                  }
                  className={`w-full min-h-[72px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${!selectedProcedure ? "opacity-40 cursor-not-allowed" : modalState === "patient-select" ? "bg-gray-50" : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}`}
                >
                  <span className="text-base font-semibold text-gray-900">
                    Paciente
                  </span>
                  <span className="flex items-center gap-2 min-w-0 ml-3">
                    <span
                      className={`text-sm truncate max-w-[140px] ${selectedPatient ? "text-teal-700 font-medium" : "text-gray-400"}`}
                    >
                      {selectedPatient ? selectedPatient.name : "Selecionar"}
                    </span>
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
                  </span>
                </button>

                {/* Gestor */}
                <button
                  disabled={!selectedPatient}
                  onClick={() =>
                    selectedPatient && setModalState("manager-select")
                  }
                  className={`w-full min-h-[72px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${!selectedPatient ? "opacity-40 cursor-not-allowed" : modalState === "manager-select" ? "bg-gray-50" : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}`}
                >
                  <span className="text-base font-semibold text-gray-900">
                    Gestor
                  </span>
                  <span className="flex items-center gap-2 min-w-0 ml-3">
                    <span
                      className={`text-sm truncate max-w-[140px] ${selectedManager ? "text-teal-700 font-medium" : "text-gray-400"}`}
                    >
                      {selectedManager ? selectedManager.name : "Selecionar"}
                    </span>
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
                  </span>
                </button>

                {/* Convênio - OPCIONAL */}
                <button
                  disabled={!selectedManager}
                  onClick={() =>
                    selectedManager && setModalState("healthplan-select")
                  }
                  className={`w-full min-h-[72px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${!selectedManager ? "opacity-40 cursor-not-allowed" : modalState === "healthplan-select" ? "bg-gray-50" : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}`}
                >
                  <span className="text-base font-semibold text-gray-900">
                    Convênio{" "}
                    <span className="text-gray-400 text-sm font-normal">
                      (opcional)
                    </span>
                  </span>
                  <span className="flex items-center gap-2 min-w-0 ml-3">
                    <span
                      className={`text-sm truncate max-w-[120px] ${selectedHealthPlan ? "text-teal-700 font-medium" : "text-gray-400"}`}
                    >
                      {selectedHealthPlan
                        ? selectedHealthPlan.name
                        : "Selecionar"}
                    </span>
                    {selectedHealthPlan && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHealthPlan(null);
                        }}
                        className="p-0.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </span>
                    )}
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
                  </span>
                </button>

                {/* Hospital - OPCIONAL */}
                <button
                  disabled={!selectedManager}
                  onClick={() =>
                    selectedManager && setModalState("hospital-select")
                  }
                  className={`w-full min-h-[72px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${!selectedManager ? "opacity-40 cursor-not-allowed" : modalState === "hospital-select" ? "bg-gray-50" : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer"}`}
                >
                  <span className="text-base font-semibold text-gray-900">
                    Hospital{" "}
                    <span className="text-gray-400 text-sm font-normal">
                      (opcional)
                    </span>
                  </span>
                  <span className="flex items-center gap-2 min-w-0 ml-3">
                    <span
                      className={`text-sm truncate max-w-[120px] ${selectedHospital ? "text-teal-700 font-medium" : "text-gray-400"}`}
                    >
                      {selectedHospital ? selectedHospital.name : "Selecionar"}
                    </span>
                    {selectedHospital && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHospital(null);
                        }}
                        className="p-0.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </span>
                    )}
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
                  </span>
                </button>
              </div>

              {/* Footer — apenas no painel esquerdo no mobile (quando nenhum painel de seleção está aberto) */}
              <div className="px-4 py-4 border-t border-gray-200 bg-white flex-shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
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
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${priority === p ? "" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
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
                      !selectedPatient ||
                      !selectedManager ||
                      !selectedProcedure
                    }
                    className="w-full px-6 py-3 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
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
              className={`w-full sm:w-2/5 bg-white flex flex-col sm:border-l border-gray-200 ${isSelectionOpen ? "flex" : "hidden sm:flex"}`}
            >
              {/* Header do painel de seleção */}
              <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
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
                <h3 className="text-base font-semibold text-gray-900 flex-1">
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

// Helper Components for Selection Content
function ProcedureSelectionContent({
  onSelect,
  onCreateNew,
  onNewItemCreated,
  selectedItemId,
  isActive,
}: any) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load procedures
  const loadProcedures = async () => {
    setLoading(true);
    try {
      const { procedureService } = await import("@/services/procedure.service");
      const data = await procedureService.getAll();
      setProcedures(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch {
      setProcedures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadProcedures();
    }
  }, [isActive, hasLoaded]);

  // Adicionar novo item criado à lista
  useEffect(() => {
    if (onNewItemCreated) {
      const handleNewItem = (item: Procedure) => {
        setProcedures((prev) => [item, ...prev]);
      };
      onNewItemCreated(handleNewItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProcedures = procedures.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-2">
      {/* Search and New Button */}
      <div className="flex gap-2 mb-0">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Procedimento"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-11 pr-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs text-gray-400 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="h-10 px-4 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm shadow-sm"
        >
          Novo
        </button>
      </div>

      {/* List */}
      <div className="mt-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredProcedures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum procedimento encontrado
          </div>
        ) : (
          filteredProcedures.map((procedure) => {
            const isSelected = selectedItemId === procedure.id;
            return (
              <button
                type="button"
                key={procedure.id}
                onClick={() => {
                  onSelect(procedure);
                }}
                className="w-full flex items-center justify-between px-2 py-3 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
              >
                <span className="text-xs text-gray-900">{procedure.name}</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "border-teal-500" : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function PatientSelectionContent({
  onSelect,
  onCreateNew,
  onNewItemCreated,
  selectedItemId,
  isActive,
}: any) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const { patientService } = await import("@/services/patient.service");
      const data = await patientService.getAll();
      setPatients(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadPatients();
    }
  }, [isActive, hasLoaded]);

  // Adicionar novo item criado à lista
  useEffect(() => {
    if (onNewItemCreated) {
      const handleNewItem = (item: Patient) => {
        setPatients((prev) => [item, ...prev]);
      };
      onNewItemCreated(handleNewItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Image
            src="/icons/search.svg"
            alt="Buscar"
            width={20}
            height={20}
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Paciente"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm"
        >
          Novo
        </button>
      </div>

      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum paciente encontrado
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const isSelected = selectedItemId === patient.id;
            return (
              <button
                type="button"
                key={patient.id}
                onClick={() => {
                  onSelect(patient);
                }}
                className="w-full flex items-center justify-between px-4 py-5 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200"
              >
                <span className="text-sm text-gray-900">{patient.name}</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-teal-500" : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-teal-500" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function HospitalSelectionContent({
  onSelect,
  onDeselect,
  onCreateNew,
  onNewItemCreated,
  selectedItemId,
  isActive,
}: any) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const { hospitalService } = await import("@/services/hospital.service");
      const data = await hospitalService.getAll();
      setHospitals(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch {
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadHospitals();
    }
  }, [isActive, hasLoaded]);

  // Adicionar novo item criado à lista
  useEffect(() => {
    if (onNewItemCreated) {
      const handleNewItem = (item: Hospital) => {
        setHospitals((prev) => [item, ...prev]);
      };
      onNewItemCreated(handleNewItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Image
            src="/icons/search.svg"
            alt="Buscar"
            width={20}
            height={20}
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Hospital"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm"
        >
          Novo
        </button>
      </div>

      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredHospitals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum hospital encontrado
          </div>
        ) : (
          filteredHospitals.map((hospital) => {
            const isSelected = selectedItemId === hospital.id;
            return (
              <button
                type="button"
                key={hospital.id}
                onClick={() => {
                  if (isSelected) {
                    onDeselect?.();
                  } else {
                    onSelect(hospital);
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-5 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200"
              >
                <span className="text-sm text-gray-900">{hospital.name}</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-teal-500" : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-teal-500" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function HealthPlanSelectionContent({
  onSelect,
  onDeselect,
  onCreateNew,
  onNewItemCreated,
  selectedItemId,
  isActive,
}: any) {
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadHealthPlans = async () => {
    setLoading(true);
    try {
      const { healthPlanService } =
        await import("@/services/health-plan.service");
      const data = await healthPlanService.getAll();
      setHealthPlans(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch {
      setHealthPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadHealthPlans();
    }
  }, [isActive, hasLoaded]);

  // Adicionar novo item criado à lista
  useEffect(() => {
    if (onNewItemCreated) {
      const handleNewItem = (item: HealthPlan) => {
        setHealthPlans((prev) => [item, ...prev]);
      };
      onNewItemCreated(handleNewItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHealthPlans = healthPlans.filter((h) =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Image
            src="/icons/search.svg"
            alt="Buscar"
            width={20}
            height={20}
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Convênio"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm"
        >
          Novo
        </button>
      </div>

      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredHealthPlans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum convênio encontrado
          </div>
        ) : (
          filteredHealthPlans.map((healthPlan) => {
            const isSelected = selectedItemId === healthPlan.id;
            return (
              <button
                type="button"
                key={healthPlan.id}
                onClick={() => {
                  if (isSelected) {
                    onDeselect?.();
                  } else {
                    onSelect(healthPlan);
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-5 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200"
              >
                <span className="text-sm text-gray-900">{healthPlan.name}</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-teal-500" : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-teal-500" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ManagerSelectionContent({
  onSelect,
  onCreateNew,
  selectedItemId,
  isActive,
}: {
  onSelect: (manager: User) => void;
  onCreateNew?: () => void;
  onNewItemCreated?: (callback: (item: User) => void) => void;
  selectedItemId?: string | number | null;
  isActive?: boolean;
}) {
  const [managers, setManagers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const loadManagers = async () => {
    setLoading(true);
    try {
      const { userService } = await import("@/services/user.service");
      const data = await userService.getAll();
      setManagers(Array.isArray(data) ? data : []);
    } catch {
      setManagers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      loadManagers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const filteredManagers = managers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Image
            src="/icons/search.svg"
            alt="Buscar"
            width={20}
            height={20}
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Gestor"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm"
          >
            Novo
          </button>
        )}
      </div>

      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredManagers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum gestor encontrado
          </div>
        ) : (
          filteredManagers.map((manager) => {
            const isSelected = selectedItemId === manager.id;
            return (
              <button
                type="button"
                key={manager.id}
                onClick={() => {
                  onSelect(manager);
                }}
                className="w-full flex items-center justify-between px-4 py-5 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-gray-900">{manager.name}</span>
                  <span className="text-xs text-gray-500">{manager.email}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-teal-500" : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-teal-500" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function TemplateSelectionContent({
  onSelect,
  isActive,
}: {
  onSelect: (template: any) => void;
  isActive?: boolean;
}) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadTemplates();
    }
  }, [isActive, hasLoaded]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await surgeryRequestService.getTemplates();
      setTemplates(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = templates.filter((t) =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6">
      <div className="relative mb-4">
        <Image
          src="/icons/search.svg"
          alt="Buscar"
          width={20}
          height={20}
          className="absolute left-3 top-1/2 -translate-y-1/2"
        />
        <input
          type="text"
          placeholder="Buscar modelo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Carregando modelos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">Nenhum modelo encontrado</p>
            <p className="text-xs text-gray-400 mt-1">
              Salve uma solicitação como modelo ao enviá-la
            </p>
          </div>
        ) : (
          filtered.map((template) => {
            const procedureName = template.template_data?.procedures?.[0]?.name;
            const hospitalName = template.template_data?.hospital?.name;
            const healthPlanName = template.template_data?.health_plan?.name;
            const meta = [hospitalName, healthPlanName]
              .filter(Boolean)
              .join(" · ");
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template)}
                className="w-full flex items-start justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {template.name}
                  </p>
                  {procedureName && (
                    <p className="text-xs text-teal-700 mt-0.5 truncate">
                      {procedureName}
                    </p>
                  )}
                  {meta && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {meta}
                    </p>
                  )}
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"
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
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
