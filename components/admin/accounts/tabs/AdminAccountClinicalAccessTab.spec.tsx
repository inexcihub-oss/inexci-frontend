import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  getAccountClinicalAccess: vi.fn(),
  exportAccountClinicalAccess: vi.fn(),
  getAccountClinicalAccessPatient: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AdminAccountClinicalAccessTab } from "./AdminAccountClinicalAccessTab";

const volume = {
  ownerId: "o-1",
  from: "2026-09-28T15:00:00Z",
  to: "2026-10-28T15:00:00Z",
  totals: { total: 15, users: 2 },
  byAction: [
    { resource: "clinical_record", action: "read", origin: "http", total: 10 },
    { resource: "patient", action: "read", origin: "ai", total: 5 },
  ],
  byUser: [
    {
      userId: "u-1",
      userName: "Dra. Ana",
      resource: "clinical_record",
      action: "read",
      total: 10,
      lastAccessAt: "2026-10-27T15:00:00Z",
    },
  ],
  daily: [{ day: "2026-10-27", total: 15 }],
  byPatient: [
    {
      patientRef: "a1b2c3d4e5",
      total: 7,
      users: 2,
      lastAccessAt: "2026-10-27T15:00:00Z",
    },
  ],
};

let blobs: Blob[];

beforeEach(() => {
  vi.clearAllMocks();
  blobs = [];
  svc.getAccountClinicalAccess.mockResolvedValue(volume);
  svc.exportAccountClinicalAccess.mockResolvedValue({
    auditLogId: "a-1",
    from: volume.from,
    to: volume.to,
    items: volume.byUser,
  });
  vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
    blobs.push(b as Blob);
    return "blob:x";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("AdminAccountClinicalAccessTab", () => {
  it("mostra o volume por tipo, por usuário e pelo assistente, sem dado de paciente", async () => {
    renderWithProviders(<AdminAccountClinicalAccessTab ownerId="o-1" />);

    expect(
      (
        await screen.findByText("Acessos a prontuário", { selector: "p" })
      ).closest("div.flex.h-full"),
    ).toHaveTextContent("15");
    expect(
      screen
        .getByText("Pelo assistente de IA", { selector: "p" })
        .closest("div.flex.h-full"),
    ).toHaveTextContent("5");
    expect(
      screen.getAllByText(/Leitura · Ficha de atendimento/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Assistente de IA")).toBeInTheDocument();
    expect(screen.getAllByText("Dra. Ana").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/O paciente aparece só por um código anônimo/),
    ).toBeInTheDocument();
  });

  it("troca o período e refaz a consulta", async () => {
    renderWithProviders(<AdminAccountClinicalAccessTab ownerId="o-1" />);
    await screen.findByText("Acessos a prontuário", { selector: "p" });
    fireEvent.click(screen.getByRole("button", { name: "90 dias" }));
    await waitFor(() =>
      expect(svc.getAccountClinicalAccess).toHaveBeenCalledWith("o-1", 90),
    );
  });

  it("exportar pede motivo, chama a API auditada e baixa o CSV só com volume", async () => {
    renderWithProviders(<AdminAccountClinicalAccessTab ownerId="o-1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Exportar CSV" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("sem nome nem dado de paciente");
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Pedido de auditoria da clínica" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() =>
      expect(svc.exportAccountClinicalAccess).toHaveBeenCalledWith(
        "o-1",
        30,
        "Pedido de auditoria da clínica",
      ),
    );
    await waitFor(() => expect(blobs).toHaveLength(1));
    const csv = await blobs[0].text();
    expect(csv).toContain('"Dra. Ana","Ficha de atendimento","Leitura","10"');
    expect(csv.split("\n")[0]).toContain("Usuário,Recurso,Ação,Acessos");
  });

  it("lista os pacientes mais acessados só pelo código anônimo", async () => {
    renderWithProviders(<AdminAccountClinicalAccessTab ownerId="o-1" />);
    const section = await screen.findByRole("region", { name: "Por paciente" });
    expect(section).toHaveTextContent("#A1B2C3D4E5");
    expect(section).toHaveTextContent("2 usuários");
    expect(section).toHaveTextContent("7");
  });

  it("ver acessos de um paciente da lista pede motivo e mostra quem acessou", async () => {
    svc.getAccountClinicalAccessPatient.mockResolvedValue({
      auditLogId: "a-2",
      patientRef: "a1b2c3d4e5",
      from: volume.from,
      to: volume.to,
      limit: 200,
      items: [
        {
          userId: "u-1",
          userName: "Dra. Ana",
          resource: "clinical_record",
          action: "read",
          origin: "ai",
          createdAt: "2026-10-27T15:00:00Z",
        },
      ],
    });
    renderWithProviders(<AdminAccountClinicalAccessTab ownerId="o-1" />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Ver acessos ao paciente #A1B2C3D4E5",
      }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("fica registrada no histórico");
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Clínica pediu quem abriu a ficha" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Ver acessos" }),
    );

    await waitFor(() =>
      expect(svc.getAccountClinicalAccessPatient).toHaveBeenCalledWith("o-1", {
        patient: "a1b2c3d4e5",
        days: 30,
        reason: "Clínica pediu quem abriu a ficha",
      }),
    );
    const result = await screen.findByRole("region", {
      name: "Acessos ao paciente #A1B2C3D4E5",
    });
    expect(result).toHaveTextContent("Dra. Ana");
    expect(result).toHaveTextContent("Leitura · Ficha de atendimento");
    expect(result).toHaveTextContent("Assistente de IA");
    fireEvent.click(
      within(result).getByRole("button", {
        name: "Fechar acessos do paciente",
      }),
    );
    expect(
      screen.queryByRole("region", { name: "Acessos ao paciente #A1B2C3D4E5" }),
    ).not.toBeInTheDocument();
  });

  it("busca pelo id que a clínica informou e recusa texto que não é código nem id", async () => {
    renderWithProviders(<AdminAccountClinicalAccessTab ownerId="o-1" />);
    const field = await screen.findByLabelText("Código ou id do paciente");

    fireEvent.change(field, { target: { value: "Maria Silva" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver acessos" }));
    expect(
      await screen.findByText(/Informe o código mostrado na lista/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.change(field, {
      target: { value: " 3F2504E0-4F89-11D3-9A0C-0305E82C3301 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ver acessos" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
