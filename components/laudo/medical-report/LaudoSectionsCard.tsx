"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { LaudoSectionForm } from "./LaudoSectionForm";
import { LaudoSectionItem } from "./LaudoSectionItem";
import { LaudoSpinner, LaudoWarningIcon } from "./LaudoSpinner";
import { stripHtmlTags } from "./medical-report-utils";
import type { MedicalReportSectionsState } from "./useMedicalReportSections";

const SAVE_BUTTON_BASE =
  "flex items-center justify-center h-8 px-3 bg-teal-700 rounded-xl text-xs font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50";

const ADD_SAVE_BUTTON =
  "flex items-center justify-center gap-1.5 h-8 px-3 bg-teal-700 rounded-xl text-xs font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50";

interface LaudoSectionsCardProps {
  state: MedicalReportSectionsState;
  isReadOnly: boolean;
}

export function LaudoSectionsCard({ state, isReadOnly }: LaudoSectionsCardProps) {
  const {
    sections,
    isLoadingSections,
    editingSection,
    sectionDraft,
    setSectionDraft,
    isSavingSection,
    isAddingSection,
    newSectionDraft,
    setNewSectionDraft,
    deletingSection,
    startAddingSection,
    cancelAddingSection,
    handleAddSection,
    handleStartEditSection,
    handleSaveSection,
    handleCancelEditSection,
    handleDeleteSection,
    handleMoveSection,
    handleDragDrop,
  } = state;
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(
    null,
  );
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(
    null,
  );

  return (
    <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center justify-between w-full gap-2">
        <h3 className="ds-section-title leading-tight flex-1 min-w-0">
          SEÇÕES DO LAUDO
        </h3>
        {!isReadOnly && (
          <button
            type="button"
            onClick={startAddingSection}
            disabled={isAddingSection}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 rounded-xl text-xs md:text-sm font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Seção
          </button>
        )}
      </div>

      {!isLoadingSections &&
        sections.length === 0 &&
        !isAddingSection &&
        !isReadOnly && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <LaudoWarningIcon />
            É necessário ao menos uma seção no laudo para enviar a solicitação.
          </div>
        )}

      {isLoadingSections && (
        <div className="flex justify-center py-4">
          <LaudoSpinner className="w-5 h-5 text-gray-400" />
        </div>
      )}

      {!isLoadingSections &&
        sections.map((section, idx) => (
          <div
            key={section.id}
            className="flex flex-col gap-3 border border-gray-200 rounded-xl p-3"
          >
            {editingSection === section.id ? (
              <LaudoSectionForm
                draft={sectionDraft}
                onChange={setSectionDraft}
                onCancel={handleCancelEditSection}
                onSave={handleSaveSection}
                isSaving={isSavingSection}
                saveDisabled={isSavingSection}
                titleLabel="Título"
                titlePlaceholder="Título da seção"
                descriptionPlaceholder="Descrição da seção..."
                saveButtonClassName={SAVE_BUTTON_BASE}
              />
            ) : (
              <LaudoSectionItem
                section={section}
                isFirst={idx === 0}
                isLast={idx === sections.length - 1}
                isReadOnly={isReadOnly}
                isDeleting={deletingSection === section.id}
                isDragTarget={
                  dragOverSectionId === section.id &&
                  draggingSectionId !== section.id
                }
                onMove={(direction) => handleMoveSection(section.id, direction)}
                onEdit={() => handleStartEditSection(section)}
                onDelete={() => handleDeleteSection(section.id)}
                dragHandlers={{
                  onDragStart: (e) => {
                    setDraggingSectionId(section.id);
                    e.dataTransfer.effectAllowed = "move";
                  },
                  onDragOver: (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverSectionId(section.id);
                  },
                  onDragLeave: () => setDragOverSectionId(null),
                  onDrop: (e) => {
                    e.preventDefault();
                    setDragOverSectionId(null);
                    if (draggingSectionId) {
                      handleDragDrop(draggingSectionId, section.id);
                    }
                    setDraggingSectionId(null);
                  },
                  onDragEnd: () => {
                    setDraggingSectionId(null);
                    setDragOverSectionId(null);
                  },
                }}
              />
            )}
          </div>
        ))}

      {isAddingSection && !isReadOnly && (
        <div className="flex flex-col gap-3 border border-teal-200 bg-teal-50/40 rounded-xl p-3">
          <LaudoSectionForm
            draft={newSectionDraft}
            onChange={setNewSectionDraft}
            onCancel={cancelAddingSection}
            onSave={handleAddSection}
            isSaving={isSavingSection}
            saveDisabled={
              isSavingSection || !stripHtmlTags(newSectionDraft.title)
            }
            titleLabel="Título *"
            titlePlaceholder="Título da nova seção"
            descriptionPlaceholder="Descrição da seção (opcional)..."
            saveButtonClassName={ADD_SAVE_BUTTON}
          />
        </div>
      )}
    </div>
  );
}
