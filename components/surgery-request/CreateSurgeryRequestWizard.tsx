"use client";

import { useState, useEffect } from "react";
import { CreateProcedureModal } from "./CreateProcedureModal";
import { CreatePatientModal } from "./CreatePatientModal";
import { CreateHospitalModal } from "./CreateHospitalModal";
import { CreateHealthPlanModal } from "./CreateHealthPlanModal";
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
  | "procedure-select"
  | "procedure-create"
  | "patient-select"
  | "patient-create"
  | "hospital-select"
  | "hospital-create"
  | "healthplan-select"
  | "healthplan-create"
  | "manager-select";

export function CreateSurgeryRequestWizard({
  isOpen,
  onClose,
  onSuccess,
}: CreateSurgeryRequestWizardProps) {
  const [modalState, setModalState] = useState<ModalState>("procedure-select");
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
    // Mantém na tela de hospital após selecionar
  };

  const handleHospitalCreated = (hospital: Hospital) => {
    if (addHospitalToList) {
      addHospitalToList(hospital);
    }
    setSelectedHospital(hospital);
    // Mantém na tela de hospital após criar
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
    setModalState("healthplan-select");
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

      const result = await surgeryRequestService.createSimple(payload);

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
    setModalState("procedure-select");
    setSelectedProcedure(null);
    setSelectedPatient(null);
    setSelectedHospital(null);
    setSelectedHealthPlan(null);
    setSelectedManager(null);
    setPriority("Baixa");
    onClose();
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-2xl">
              <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-semibold text-gray-900">
                Criando solicitação...
              </p>
              <p className="text-sm text-gray-500">Por favor, aguarde</p>
            </div>
          </div>
        )}

        <div
          className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto overflow-hidden flex flex-col"
          style={{ height: "min(85vh, 800px)" }}
        >
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Left Panel - Form */}
            <div className="w-full md:w-3/5 flex flex-col bg-white h-full md:border-r border-gray-200">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Nova solicitação
                </h2>
              </div>

              {/* Form Fields */}
              <div className="flex-1 flex flex-col">
                {/* Procedimento - OBRIGATÓRIO (PRIMEIRO) */}
                <button
                  onClick={() => setModalState("procedure-select")}
                  className={`w-full h-20 px-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    modalState === "procedure-select" ? "bg-gray-50" : ""
                  }`}
                >
                  <span className="text-lg font-semibold text-gray-900">
                    Procedimento
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-sm ${selectedProcedure ? "text-gray-900" : "text-gray-400"}`}
                    >
                      {selectedProcedure
                        ? selectedProcedure.name
                        : "Selecionar"}
                    </span>
                    <svg
                      className="w-5 h-5 text-gray-900"
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

                {/* Paciente - OBRIGATÓRIO */}
                <button
                  onClick={() => setModalState("patient-select")}
                  className={`w-full h-20 px-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    modalState === "patient-select" ? "bg-gray-50" : ""
                  }`}
                >
                  <span className="text-lg font-semibold text-gray-900">
                    Paciente
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-sm ${selectedPatient ? "text-gray-900" : "text-gray-400"}`}
                    >
                      {selectedPatient ? selectedPatient.name : "Selecionar"}
                    </span>
                    <svg
                      className="w-5 h-5 text-gray-900"
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

                {/* Gestor - OBRIGATÓRIO */}
                <button
                  onClick={() => setModalState("manager-select")}
                  className={`w-full h-20 px-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    modalState === "manager-select" ? "bg-gray-50" : ""
                  }`}
                >
                  <span className="text-lg font-semibold text-gray-900">
                    Gestor
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-sm ${selectedManager ? "text-gray-900" : "text-gray-400"}`}
                    >
                      {selectedManager ? selectedManager.name : "Selecionar"}
                    </span>
                    <svg
                      className="w-5 h-5 text-gray-900"
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
                  onClick={() => setModalState("healthplan-select")}
                  className={`w-full h-20 px-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    modalState === "healthplan-select" ? "bg-gray-50" : ""
                  }`}
                >
                  <span className="text-lg font-semibold text-gray-900">
                    Convênio{" "}
                    <span className="text-gray-400 text-sm">(opcional)</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-sm ${selectedHealthPlan ? "text-gray-900" : "text-gray-400"}`}
                    >
                      {selectedHealthPlan
                        ? selectedHealthPlan.name
                        : "Selecionar"}
                    </span>
                    <svg
                      className="w-5 h-5 text-gray-900"
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
                  onClick={() => setModalState("hospital-select")}
                  className={`w-full h-20 px-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    modalState === "hospital-select" ? "bg-gray-50" : ""
                  }`}
                >
                  <span className="text-lg font-semibold text-gray-900">
                    Hospital{" "}
                    <span className="text-gray-400 text-sm">(opcional)</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-sm truncate max-w-xs ${selectedHospital ? "text-gray-900" : "text-gray-400"}`}
                    >
                      {selectedHospital ? selectedHospital.name : "Selecionar"}
                    </span>
                    <svg
                      className="w-5 h-5 text-gray-900"
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
            </div>

            {/* Right Panel - Will show selection modal content */}
            <div className="w-full md:w-2/5 bg-white h-full overflow-hidden flex flex-col border-l border-gray-200">
              {/* Header com botão de fechar - SEMPRE VISÍVEL */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xl font-semibold text-gray-900">
                  {modalState === "procedure-select" && "Procedimento"}
                  {modalState === "patient-select" && "Paciente"}
                  {modalState === "manager-select" && "Gestor"}
                  {modalState === "healthplan-select" && "Convênio"}
                  {modalState === "hospital-select" && "Hospital"}
                </h3>
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <span className="sr-only">Fechar</span>
                  <svg
                    className="w-6 h-6 text-gray-400"
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
              {modalState === "procedure-select" && (
                <div className="flex-1 overflow-y-auto">
                  <ProcedureSelectionContent
                    onSelect={handleProcedureSelected}
                    onCreateNew={() => setModalState("procedure-create")}
                    onNewItemCreated={(callback: (item: Procedure) => void) => {
                      setAddProcedureToList(() => callback);
                    }}
                    selectedItemId={selectedProcedure?.id}
                    isActive={modalState === "procedure-select"}
                  />
                </div>
              )}

              {modalState === "patient-select" && (
                <div className="flex-1 overflow-y-auto">
                  <PatientSelectionContent
                    onSelect={handlePatientSelected}
                    onCreateNew={() => setModalState("patient-create")}
                    onNewItemCreated={(callback: (item: Patient) => void) => {
                      setAddPatientToList(() => callback);
                    }}
                    selectedItemId={selectedPatient?.id}
                    isActive={modalState === "patient-select"}
                  />
                </div>
              )}

              {modalState === "hospital-select" && (
                <div className="flex-1 overflow-y-auto">
                  <HospitalSelectionContent
                    onSelect={handleHospitalSelected}
                    onCreateNew={() => setModalState("hospital-create")}
                    onNewItemCreated={(callback: (item: Hospital) => void) => {
                      setAddHospitalToList(() => callback);
                    }}
                    selectedItemId={selectedHospital?.id}
                    isActive={modalState === "hospital-select"}
                  />
                </div>
              )}

              {modalState === "healthplan-select" && (
                <div className="flex-1 overflow-y-auto">
                  <HealthPlanSelectionContent
                    onSelect={handleHealthPlanSelected}
                    onCreateNew={() => setModalState("healthplan-create")}
                    onNewItemCreated={(
                      callback: (item: HealthPlan) => void,
                    ) => {
                      setAddHealthPlanToList(() => callback);
                    }}
                    selectedItemId={selectedHealthPlan?.id}
                    isActive={modalState === "healthplan-select"}
                  />
                </div>
              )}

              {modalState === "manager-select" && (
                <div className="flex-1 overflow-y-auto">
                  <ManagerSelectionContent
                    onSelect={handleManagerSelected}
                    selectedItemId={selectedManager?.id}
                    isActive={modalState === "manager-select"}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer - Full Width - SEMPRE VISÍVEL */}
          <div className="px-3 py-4 border-t-2 border-gray-200 bg-white flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <button
                  onClick={() => setPriority(PRIORITY.LOW)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    priority === PRIORITY.LOW
                      ? ""
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                  style={
                    priority === PRIORITY.LOW
                      ? {
                          backgroundColor: priorityColors[PRIORITY.LOW].bg,
                          color: priorityColors[PRIORITY.LOW].text,
                        }
                      : {}
                  }
                >
                  {PRIORITY_LABELS[PRIORITY.LOW]}
                </button>
                <button
                  onClick={() => setPriority(PRIORITY.MEDIUM)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    priority === PRIORITY.MEDIUM
                      ? ""
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                  style={
                    priority === PRIORITY.MEDIUM
                      ? {
                          backgroundColor: priorityColors[PRIORITY.MEDIUM].bg,
                          color: priorityColors[PRIORITY.MEDIUM].text,
                        }
                      : {}
                  }
                >
                  {PRIORITY_LABELS[PRIORITY.MEDIUM]}
                </button>
                <button
                  onClick={() => setPriority(PRIORITY.HIGH)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    priority === PRIORITY.HIGH
                      ? ""
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                  style={
                    priority === PRIORITY.HIGH
                      ? {
                          backgroundColor: priorityColors[PRIORITY.HIGH].bg,
                          color: priorityColors[PRIORITY.HIGH].text,
                        }
                      : {}
                  }
                >
                  {PRIORITY_LABELS[PRIORITY.HIGH]}
                </button>
                <button
                  onClick={() => setPriority(PRIORITY.URGENT)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    priority === PRIORITY.URGENT
                      ? ""
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                  style={
                    priority === PRIORITY.URGENT
                      ? {
                          backgroundColor: priorityColors[PRIORITY.URGENT].bg,
                          color: priorityColors[PRIORITY.URGENT].text,
                        }
                      : {}
                  }
                >
                  {PRIORITY_LABELS[PRIORITY.URGENT]}
                </button>
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
                className="w-full sm:w-auto px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
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
    } catch (error: any) {
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
            className="w-full h-10 pl-11 pr-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs text-gray-400 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="h-10 px-4 bg-white border border-gray-200 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm shadow-sm"
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
    } catch (error: any) {
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
            className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
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
    } catch (error: any) {
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
            className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
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
                  onSelect(hospital);
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
    } catch (error: any) {
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
            className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
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
                  onSelect(healthPlan);
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
  selectedItemId,
  isActive,
}: {
  onSelect: (manager: User) => void;
  selectedItemId?: string | number | null;
  isActive?: boolean;
}) {
  const [managers, setManagers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadManagers = async () => {
    setLoading(true);
    try {
      const { userService } = await import("@/services/user.service");
      const data = await userService.getAll();
      setManagers(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch (error: any) {
      setManagers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadManagers();
    }
  }, [isActive, hasLoaded]);

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
            className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
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
