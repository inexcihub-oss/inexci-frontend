import type { ReactNode } from "react";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TestProviders,
  createTestQueryClient,
} from "@/test-utils/render-with-providers";
import { useMedicalReportSections } from "../medical-report/useMedicalReportSections";

const service = vi.hoisted(() => ({
  getSections: vi.fn(),
  createSection: vi.fn(),
  updateSection: vi.fn(),
  deleteSection: vi.fn(),
  reorderSections: vi.fn(),
}));

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: service,
}));

const sectionA = { id: "a", title: "<p>A</p>", description: "" };
const sectionB = { id: "b", title: "<p>B</p>", description: "corpo" };
const sectionC = { id: "c", title: "<p>C</p>", description: null };

function wrapper({ children }: { children: ReactNode }) {
  return (
    <TestProviders queryClient={createTestQueryClient()}>
      {children}
    </TestProviders>
  );
}

async function setup(onUpdate = vi.fn()) {
  const hook = renderHook(
    () => useMedicalReportSections({ surgeryRequestId: 7, onUpdate }),
    { wrapper },
  );
  await waitFor(() => expect(hook.result.current.isLoadingSections).toBe(false));
  return { ...hook, onUpdate };
}

describe("useMedicalReportSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.getSections.mockResolvedValue([sectionA, sectionB, sectionC]);
    service.reorderSections.mockResolvedValue(undefined);
  });

  it("carrega as seções da solicitação", async () => {
    const { result } = await setup();
    expect(service.getSections).toHaveBeenCalledWith(7);
    expect(result.current.sections.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("exige título ao adicionar seção", async () => {
    const { result } = await setup();
    act(() => result.current.startAddingSection());
    await act(() => result.current.handleAddSection());
    expect(service.createSection).not.toHaveBeenCalled();
    expect(
      await screen.findByText("O título da seção é obrigatório"),
    ).toBeInTheDocument();
  });

  it("cria seção, fecha o formulário e avisa a página", async () => {
    const created = { id: "d", title: "<p>D</p>", description: "x" };
    service.createSection.mockResolvedValue(created);
    const { result, onUpdate } = await setup();
    act(() => result.current.startAddingSection());
    act(() =>
      result.current.setNewSectionDraft(() => ({
        title: "<p>D</p>",
        description: "x",
      })),
    );
    await act(() => result.current.handleAddSection());
    expect(service.createSection).toHaveBeenCalledWith(7, {
      title: "<p>D</p>",
      description: "x",
    });
    expect(result.current.sections.at(-1)).toEqual(created);
    expect(result.current.isAddingSection).toBe(false);
    expect(onUpdate).toHaveBeenCalled();
  });

  it("edita seção existente com descrição nula virando vazia", async () => {
    const updated = { ...sectionC, title: "<p>C2</p>" };
    service.updateSection.mockResolvedValue(updated);
    const { result } = await setup();
    act(() => result.current.handleStartEditSection(sectionC as never));
    expect(result.current.sectionDraft).toEqual({
      title: "<p>C</p>",
      description: "",
    });
    act(() =>
      result.current.setSectionDraft((d) => ({ ...d, title: "<p>C2</p>" })),
    );
    await act(() => result.current.handleSaveSection());
    expect(service.updateSection).toHaveBeenCalledWith(7, "c", {
      title: "<p>C2</p>",
      description: "",
    });
    expect(result.current.sections[2]).toEqual(updated);
    expect(result.current.editingSection).toBeNull();
  });

  it("remove seção e mostra erro quando a API falha", async () => {
    service.deleteSection.mockRejectedValueOnce(new Error("x"));
    const { result } = await setup();
    await act(() => result.current.handleDeleteSection("a"));
    expect(result.current.sections).toHaveLength(3);
    expect(await screen.findByText("Erro ao remover seção")).toBeInTheDocument();

    service.deleteSection.mockResolvedValueOnce(undefined);
    await act(() => result.current.handleDeleteSection("a"));
    expect(result.current.sections.map((s) => s.id)).toEqual(["b", "c"]);
  });

  it("move para baixo e persiste a nova ordem", async () => {
    const { result } = await setup();
    await act(() => result.current.handleMoveSection("a", "down"));
    expect(result.current.sections.map((s) => s.id)).toEqual(["b", "a", "c"]);
    expect(service.reorderSections).toHaveBeenCalledWith(7, ["b", "a", "c"]);
  });

  it("ignora mover além dos limites", async () => {
    const { result } = await setup();
    await act(() => result.current.handleMoveSection("a", "up"));
    expect(service.reorderSections).not.toHaveBeenCalled();
  });

  it("reordena por arrastar e soltar", async () => {
    const { result } = await setup();
    await act(() => result.current.handleDragDrop("c", "a"));
    expect(result.current.sections.map((s) => s.id)).toEqual(["c", "a", "b"]);
    expect(service.reorderSections).toHaveBeenCalledWith(7, ["c", "a", "b"]);
  });
});
