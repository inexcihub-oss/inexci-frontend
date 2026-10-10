"use client";

import React from "react";
import { ChevronLeft, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasAnyArea, Permission } from "@/lib/permissions";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { CreateProcedureModal } from "./CreateProcedureModal";
import { CreatePatientModal } from "./CreatePatientModal";
import { CreateHospitalModal } from "./CreateHospitalModal";
import { CreateHealthPlanModal } from "./CreateHealthPlanModal";
import { SurgeryRequestTemplateSummary } from "@/services/surgery-request.service";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
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
  TemplateSelectionContent,
} from "./wizard-steps/SelectionContents";
import { WizardStepRow } from "./wizard-steps/WizardStepRow";
import {
  useCreateSurgeryRequestWizard,
  WIZARD_PANEL_TITLES,
} from "./useCreateSurgeryRequestWizard";

interface CreateSurgeryRequestWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTemplate?: SurgeryRequestTemplateSummary | null;
}

const PRIORITIES: PriorityLevel[] = [
  PRIORITY.LOW,
  PRIORITY.MEDIUM,
  PRIORITY.HIGH,
  PRIORITY.URGENT,
];

export function CreateSurgeryRequestWizard({
  isOpen,
  onClose,
  onSuccess,
  initialTemplate,
}: CreateSurgeryRequestWizardProps) {
  const { can, permissions } = useAuth();
  const { emTour } = useOnboarding();
  const podeAdministrarCadastros = can(Permission.ADMINISTRACAO);
  const podeCriarCadastroTransversal = hasAnyArea(permissions);
  const wizard = useCreateSurgeryRequestWizard({
    isOpen,
    onClose,
    onSuccess,
    initialTemplate,
  });

  if (!isOpen) return null;

  const { panel, openPanel, loading } = wizard;
  const isSelectionOpen = panel !== "none";

  return (
    <>
      <Modal
        isOpen
        onClose={wizard.close}
        title="Nova solicitação"
        size="lg"
        disableClose={loading || emTour}
        footer={
          <div className={isSelectionOpen ? "hidden sm:block" : undefined}>
            <ModalFooter className="flex-col sm:flex-row">
              <div
                role="radiogroup"
                aria-label="Prioridade"
                className="flex items-center gap-2 flex-wrap w-full sm:w-auto"
              >
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={wizard.priority === p}
                    onClick={() => wizard.setPriority(p)}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${wizard.priority === p ? "shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                    style={
                      wizard.priority === p
                        ? {
                            backgroundColor: priorityColors[p].bg,
                            color: priorityColors[p].text,
                          }
                        : undefined
                    }
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
              <SpinnerButton
                onClick={wizard.submit}
                disabled={emTour || !wizard.canSubmit}
                isLoading={loading}
                loadingText="Criando..."
                className="w-full sm:w-auto"
              >
                Nova solicitação
              </SpinnerButton>
            </ModalFooter>
          </div>
        }
      >
        <div
          className="relative flex flex-col sm:flex-row min-h-full sm:h-[60vh] sm:max-h-[560px]"
          aria-busy={loading}
        >
          {loading && (
            <div
              role="status"
              className="absolute inset-0 z-10 bg-white/80 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-lg font-semibold text-gray-900">
                Criando solicitação...
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                Por favor, aguarde
              </p>
            </div>
          )}

          <div
            className={`w-full sm:w-3/5 flex-col bg-white sm:border-r border-gray-200 sm:overflow-y-auto ${isSelectionOpen ? "hidden sm:flex" : "flex"}`}
          >
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => openPanel("template-select")}
                aria-pressed={panel === "template-select"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                  panel === "template-select"
                    ? "bg-teal-50 text-teal-700 border-teal-300"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Copy className="w-3.5 h-3.5" aria-hidden />
                Usar modelo
              </button>
            </div>

            <WizardStepRow
              label="Procedimento"
              value={wizard.selectedProcedure?.name}
              active={panel === "procedure-select"}
              onOpen={() => openPanel("procedure-select")}
            />
            <WizardStepRow
              label="Paciente"
              value={wizard.selectedPatient?.name}
              disabled={!wizard.selectedProcedure}
              active={panel === "patient-select"}
              onOpen={() => openPanel("patient-select")}
            />
            <WizardStepRow
              label="Médico"
              value={wizard.selectedDoctor?.name}
              disabled={!wizard.selectedPatient}
              active={panel === "doctor-select"}
              onOpen={() => openPanel("doctor-select")}
            />
            <WizardStepRow
              label="Convênio"
              optional
              value={wizard.selectedHealthPlan?.name}
              disabled={!wizard.selectedDoctor}
              active={panel === "healthplan-select"}
              onOpen={() => openPanel("healthplan-select")}
              onClear={wizard.clearHealthPlan}
            />
            <WizardStepRow
              label="Hospital"
              optional
              value={wizard.selectedHospital?.name}
              disabled={!wizard.selectedDoctor}
              active={panel === "hospital-select"}
              onOpen={() => openPanel("hospital-select")}
              onClear={wizard.clearHospital}
            />
          </div>

          <div
            className={`w-full sm:w-2/5 bg-white flex-col min-h-0 flex-1 ${isSelectionOpen ? "flex" : "hidden sm:flex"}`}
          >
            <div className="px-4 py-3 md:px-5 md:py-4 border-b border-gray-200 flex items-center gap-3 flex-shrink-0 min-h-[57px]">
              <button
                type="button"
                onClick={() => openPanel("none")}
                aria-label="Voltar"
                className="sm:hidden w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" aria-hidden />
              </button>
              <h3 className="text-sm md:text-base font-semibold text-gray-900 flex-1">
                {WIZARD_PANEL_TITLES[panel] ?? ""}
              </h3>
            </div>

            <div className="flex-1 sm:overflow-y-auto min-h-0">
              {panel === "none" && (
                <div className="flex items-center justify-center h-full min-h-[120px] text-gray-300">
                  <p className="text-sm">Selecione um campo ao lado</p>
                </div>
              )}
              {panel === "template-select" && (
                <TemplateSelectionContent
                  onSelect={wizard.selectTemplate}
                  isActive
                />
              )}
              {panel === "procedure-select" && (
                <ProcedureSelectionContent
                  onSelect={wizard.selectProcedure}
                  onCreateNew={() => openPanel("procedure-create")}
                  onDeleteSelected={wizard.procedureDeleted}
                  onNewItemCreated={wizard.registerProcedureAdder}
                  selectedItemId={wizard.selectedProcedure?.id}
                  isActive
                  canCreate={podeCriarCadastroTransversal}
                  canDelete={podeAdministrarCadastros}
                />
              )}
              {panel === "patient-select" && (
                <PatientSelectionContent
                  onSelect={wizard.selectPatient}
                  onCreateNew={() => openPanel("patient-create")}
                  onNewItemCreated={wizard.registerPatientAdder}
                  selectedItemId={wizard.selectedPatient?.id}
                  isActive
                />
              )}
              {panel === "hospital-select" && (
                <HospitalSelectionContent
                  onSelect={wizard.selectHospital}
                  onDeselect={wizard.clearHospital}
                  onCreateNew={() => openPanel("hospital-create")}
                  onNewItemCreated={wizard.registerHospitalAdder}
                  selectedItemId={wizard.selectedHospital?.id}
                  isActive
                  canCreate={podeCriarCadastroTransversal}
                />
              )}
              {panel === "healthplan-select" && (
                <HealthPlanSelectionContent
                  onSelect={wizard.selectHealthPlan}
                  onDeselect={wizard.clearHealthPlan}
                  onCreateNew={() => openPanel("healthplan-create")}
                  onNewItemCreated={wizard.registerHealthPlanAdder}
                  selectedItemId={wizard.selectedHealthPlan?.id}
                  isActive
                  canCreate={podeCriarCadastroTransversal}
                />
              )}
              {panel === "doctor-select" && (
                <DoctorSelectionContent
                  onSelect={wizard.selectDoctor}
                  availableDoctors={wizard.availableDoctors}
                  loadingDoctors={wizard.loadingDoctors}
                  selectedItemId={wizard.selectedDoctor?.id}
                />
              )}
            </div>
          </div>
        </div>
      </Modal>

      <CreateProcedureModal
        isOpen={panel === "procedure-create"}
        onClose={() => openPanel("procedure-select")}
        onSuccess={wizard.procedureCreated}
      />

      <CreatePatientModal
        isOpen={panel === "patient-create"}
        onClose={() => openPanel("patient-select")}
        onSuccess={wizard.patientCreated}
      />

      <CreateHospitalModal
        isOpen={panel === "hospital-create"}
        onClose={() => openPanel("hospital-select")}
        onSuccess={wizard.hospitalCreated}
      />

      <CreateHealthPlanModal
        isOpen={panel === "healthplan-create"}
        onClose={() => openPanel("healthplan-select")}
        onSuccess={wizard.healthPlanCreated}
      />
    </>
  );
}
