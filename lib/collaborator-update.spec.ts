import { describe, it, expect } from "vitest";
import { buildCollaboratorUpdatePayload } from "./collaborator-update";
import { Permission } from "./permissions";

const original = {
  email: "colab@clinica.com",
  permissions: [Permission.AGENDA],
  isDoctor: false,
};

describe("buildCollaboratorUpdatePayload", () => {
  it("devolve null quando nada mudou", () => {
    expect(buildCollaboratorUpdatePayload(original, { ...original })).toBeNull();
  });

  it("envia só o e-mail quando só ele mudou", () => {
    expect(
      buildCollaboratorUpdatePayload(original, {
        ...original,
        email: "novo@clinica.com",
      }),
    ).toEqual({ email: "novo@clinica.com" });
  });

  it("envia só as permissões quando só elas mudaram", () => {
    expect(
      buildCollaboratorUpdatePayload(original, {
        ...original,
        permissions: [Permission.AGENDA, Permission.ATENDIMENTO],
      }),
    ).toEqual({
      permissions: [Permission.AGENDA, Permission.ATENDIMENTO],
    });
  });

  describe('promoção e despromoção de "é médico"', () => {
    it("leva CRM e UF junto ao promover — o DTO do backend os exige", () => {
      expect(
        buildCollaboratorUpdatePayload(original, {
          ...original,
          isDoctor: true,
          crm: "123456",
          crmState: "SP",
          specialty: "Ortopedia",
        }),
      ).toEqual({
        isDoctor: true,
        crm: "123456",
        crmState: "SP",
        specialty: "Ortopedia",
      });
    });

    it("omite a especialidade quando ela está vazia", () => {
      expect(
        buildCollaboratorUpdatePayload(original, {
          ...original,
          isDoctor: true,
          crm: "123456",
          crmState: "SP",
          specialty: "",
        }),
      ).toEqual({ isDoctor: true, crm: "123456", crmState: "SP" });
    });

    it("não manda CRM ao despromover — só o desligamento", () => {
      expect(
        buildCollaboratorUpdatePayload(
          { ...original, isDoctor: true },
          {
            ...original,
            isDoctor: false,
            crm: "123456",
            crmState: "SP",
            specialty: "Ortopedia",
          },
        ),
      ).toEqual({ isDoctor: false });
    });

    it("não reenvia isDoctor quando ele não mudou", () => {
      const payload = buildCollaboratorUpdatePayload(
        { ...original, isDoctor: true },
        {
          ...original,
          isDoctor: true,
          crm: "123456",
          crmState: "SP",
          email: "novo@clinica.com",
        },
      );
      expect(payload).toEqual({ email: "novo@clinica.com" });
      expect(payload).not.toHaveProperty("isDoctor");
    });

    it("combina despromoção com mudança de áreas na mesma chamada", () => {
      // O caso do bug I2: ao desligar "é médico", as áreas gravadas são só as
      // marcadas manualmente — as três fixas nunca viraram concessão.
      expect(
        buildCollaboratorUpdatePayload(
          { ...original, isDoctor: true, permissions: [] },
          { ...original, isDoctor: false, permissions: [] },
        ),
      ).toEqual({ isDoctor: false });
    });

    it("ignora isDoctor quando o chamador não informa o campo", () => {
      expect(
        buildCollaboratorUpdatePayload(
          { email: original.email, permissions: original.permissions },
          {
            email: "novo@clinica.com",
            permissions: original.permissions,
          },
        ),
      ).toEqual({ email: "novo@clinica.com" });
    });
  });
});
