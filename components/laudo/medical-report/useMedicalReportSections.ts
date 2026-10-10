"use client";

import { useCallback, useEffect, useState } from "react";
import {
  surgeryRequestService,
  type ReportSection,
} from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";
import { stripHtmlTags, type SectionDraft } from "./medical-report-utils";

const EMPTY_DRAFT: SectionDraft = { title: "", description: "" };

interface UseMedicalReportSectionsParams {
  surgeryRequestId: string | number;
  onUpdate: () => void;
}

export function useMedicalReportSections({
  surgeryRequestId,
  onUpdate,
}: UseMedicalReportSectionsParams) {
  const { showToast } = useToast();
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState<SectionDraft>(EMPTY_DRAFT);
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionDraft, setNewSectionDraft] =
    useState<SectionDraft>(EMPTY_DRAFT);
  const [deletingSection, setDeletingSection] = useState<string | null>(null);

  useEffect(() => {
    if (!surgeryRequestId) return;
    setIsLoadingSections(true);
    surgeryRequestService
      .getSections(surgeryRequestId)
      .then(setSections)
      .catch(() => {})
      .finally(() => setIsLoadingSections(false));
  }, [surgeryRequestId]);

  const startAddingSection = useCallback(() => {
    setNewSectionDraft(EMPTY_DRAFT);
    setIsAddingSection(true);
  }, []);

  const cancelAddingSection = useCallback(() => {
    setIsAddingSection(false);
    setNewSectionDraft(EMPTY_DRAFT);
  }, []);

  const handleAddSection = useCallback(async () => {
    if (!stripHtmlTags(newSectionDraft.title)) {
      showToast("O título da seção é obrigatório", "error");
      return;
    }
    setIsSavingSection(true);
    try {
      const created = await surgeryRequestService.createSection(
        surgeryRequestId,
        {
          title: newSectionDraft.title,
          description: newSectionDraft.description,
        },
      );
      setSections((prev) => [...prev, created]);
      setNewSectionDraft(EMPTY_DRAFT);
      setIsAddingSection(false);
      onUpdate();
    } catch {
      showToast("Erro ao criar seção", "error");
    } finally {
      setIsSavingSection(false);
    }
  }, [newSectionDraft, surgeryRequestId, onUpdate, showToast]);

  const handleStartEditSection = useCallback((section: ReportSection) => {
    setEditingSection(section.id);
    setSectionDraft({
      title: section.title,
      description: section.description ?? "",
    });
  }, []);

  const handleSaveSection = useCallback(async () => {
    if (!editingSection) return;
    if (!stripHtmlTags(sectionDraft.title)) {
      showToast("O título da seção é obrigatório", "error");
      return;
    }
    setIsSavingSection(true);
    try {
      const updated = await surgeryRequestService.updateSection(
        surgeryRequestId,
        editingSection,
        { title: sectionDraft.title, description: sectionDraft.description },
      );
      setSections((prev) =>
        prev.map((s) => (s.id === editingSection ? updated : s)),
      );
      setEditingSection(null);
      onUpdate();
    } catch {
      showToast("Erro ao salvar seção", "error");
    } finally {
      setIsSavingSection(false);
    }
  }, [editingSection, sectionDraft, surgeryRequestId, onUpdate, showToast]);

  const handleCancelEditSection = useCallback(() => {
    setEditingSection(null);
  }, []);

  const handleDeleteSection = useCallback(
    async (sectionId: string) => {
      setDeletingSection(sectionId);
      try {
        await surgeryRequestService.deleteSection(surgeryRequestId, sectionId);
        setSections((prev) => prev.filter((s) => s.id !== sectionId));
        onUpdate();
      } catch {
        showToast("Erro ao remover seção", "error");
      } finally {
        setDeletingSection(null);
      }
    },
    [surgeryRequestId, onUpdate, showToast],
  );

  const persistOrder = useCallback(
    async (reordered: ReportSection[]) => {
      setSections(reordered);
      try {
        await surgeryRequestService.reorderSections(
          surgeryRequestId,
          reordered.map((s) => s.id),
        );
      } catch {
        showToast("Erro ao reordenar seções", "error");
      }
    },
    [surgeryRequestId, showToast],
  );

  const handleMoveSection = useCallback(
    async (sectionId: string, direction: "up" | "down") => {
      const idx = sections.findIndex((s) => s.id === sectionId);
      if (idx === -1) return;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= sections.length) return;

      const reordered = [...sections];
      [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
      await persistOrder(reordered);
    },
    [sections, persistOrder],
  );

  const handleDragDrop = useCallback(
    async (dragId: string, dropId: string) => {
      if (dragId === dropId) return;
      const dragIdx = sections.findIndex((s) => s.id === dragId);
      const dropIdx = sections.findIndex((s) => s.id === dropId);
      if (dragIdx === -1 || dropIdx === -1) return;

      const reordered = [...sections];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(dropIdx, 0, moved);
      await persistOrder(reordered);
    },
    [sections, persistOrder],
  );

  return {
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
  };
}

export type MedicalReportSectionsState = ReturnType<
  typeof useMedicalReportSections
>;
