import { describe, it, expect } from "vitest";
import {
  buildAvatarUpdate,
  buildCollaboratorUpdatePayload,
  buildDoctorProfileUpdatePayload,
  buildOwnDoctorProfilePayload,
} from "./collaborator-update";
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
  describe("conselho profissional (MIG-02)", () => {
    it("promove a nutricionista sem número, mandando só o conselho", () => {
      expect(
        buildCollaboratorUpdatePayload(original, {
          ...original,
          isDoctor: true,
          council: "CRN",
          crm: "",
          crmState: "",
        }),
      ).toEqual({ isDoctor: true, council: "CRN" });
    });

    it("leva número e UF de outro conselho quando preenchidos", () => {
      expect(
        buildCollaboratorUpdatePayload(original, {
          ...original,
          isDoctor: true,
          council: "COREN",
          crm: "123",
          crmState: "RJ",
        }),
      ).toEqual({
        isDoctor: true,
        council: "COREN",
        crm: "123",
        crmState: "RJ",
      });
    });

    it("médico CRM explícito continua mandando número e UF", () => {
      expect(
        buildCollaboratorUpdatePayload(original, {
          ...original,
          isDoctor: true,
          council: "CRM",
          crm: "123456",
          crmState: "SP",
        }),
      ).toEqual({
        isDoctor: true,
        council: "CRM",
        crm: "123456",
        crmState: "SP",
      });
    });
  });
});

describe("buildDoctorProfileUpdatePayload", () => {
  const perfil = {
    council: "CRN" as const,
    crm: "4567",
    crmState: "RJ",
    specialty: "Nutrição clínica",
  };

  it("devolve null quando nada mudou", () => {
    expect(buildDoctorProfileUpdatePayload(perfil, { ...perfil })).toBeNull();
  });

  // Antes ia `crm: undefined` ("não mexer") e o número continuava gravado.
  it("número e UF apagados vão como string vazia", () => {
    expect(
      buildDoctorProfileUpdatePayload(perfil, {
        ...perfil,
        crm: "",
        crmState: "",
      }),
    ).toEqual({ crm: "", crmState: "" });
  });

  it("especialidade apagada também vai vazia", () => {
    expect(
      buildDoctorProfileUpdatePayload(perfil, { ...perfil, specialty: "  " }),
    ).toEqual({ specialty: "" });
  });

  it("só envia o que mudou, aparado", () => {
    expect(
      buildDoctorProfileUpdatePayload(perfil, { ...perfil, crm: " 9999 " }),
    ).toEqual({ crm: "9999" });
  });

  it("conselho só vai quando mudou", () => {
    expect(
      buildDoctorProfileUpdatePayload(perfil, { ...perfil, council: "CRP" }),
    ).toEqual({ council: "CRP" });
  });
});

describe("buildOwnDoctorProfilePayload (Configurações)", () => {
  const salvo = { crm: "1234", crmState: "RJ", specialty: "Nutrição" };

  it("apagar número e UF manda string vazia (antes ia undefined = não mexer)", () => {
    expect(
      buildOwnDoctorProfilePayload(salvo, { ...salvo, crm: "", crmState: "" }),
    ).toEqual({ crm: "", crmState: "" });
  });

  it("nada mudou: null (pula a chamada)", () => {
    expect(buildOwnDoctorProfilePayload(salvo, { ...salvo })).toBeNull();
  });

  it("perfil antigo com número vazio não reenvia o número ao trocar a especialidade", () => {
    expect(
      buildOwnDoctorProfilePayload(
        { crm: "", crmState: "", specialty: "" },
        { crm: "", crmState: "", specialty: "Ortopedia" },
      ),
    ).toEqual({ specialty: "Ortopedia" });
  });

  it("campos ausentes contam como vazios", () => {
    expect(buildOwnDoctorProfilePayload({}, { crm: " 99 " })).toEqual({
      crm: "99",
    });
  });

  it("nunca manda o conselho", () => {
    const payload = buildOwnDoctorProfilePayload(salvo, {
      ...salvo,
      crm: "5",
    });
    expect(payload).not.toHaveProperty("council");
  });

  it("sem allowCouncil, conselho trocado é ignorado (admin delegado e demais)", () => {
    expect(
      buildOwnDoctorProfilePayload(
        { ...salvo, council: "CRN" },
        { ...salvo, council: "CRM" },
      ),
    ).toBeNull();
  });

  it("dono da conta (allowCouncil) manda o conselho quando mudou", () => {
    expect(
      buildOwnDoctorProfilePayload(
        { ...salvo, council: "CRN" },
        { ...salvo, council: "CRP" },
        { allowCouncil: true },
      ),
    ).toEqual({ council: "CRP" });
  });

  it("dono da conta sem trocar o conselho não o reenvia", () => {
    expect(
      buildOwnDoctorProfilePayload(
        { ...salvo, council: "CRM" },
        { ...salvo, council: "CRM", crm: "9" },
        { allowCouncil: true },
      ),
    ).toEqual({ crm: "9" });
  });
});

describe("buildAvatarUpdate (Configurações)", () => {
  it("arquivo novo: manda o caminho do upload", () => {
    expect(
      buildAvatarUpdate({
        savedAvatarUrl: "avatars/c/antigo.png",
        uploadedPath: "avatars/c/novo.png",
        hasPreview: true,
      }),
    ).toEqual({ avatarUrl: "avatars/c/novo.png" });
  });

  it("havia avatar e o usuário removeu: manda null", () => {
    expect(
      buildAvatarUpdate({
        savedAvatarUrl: "avatars/c/antigo.png",
        uploadedPath: undefined,
        hasPreview: false,
      }),
    ).toEqual({ avatarUrl: null });
  });

  it("avatar mantido: não manda o campo", () => {
    expect(
      buildAvatarUpdate({
        savedAvatarUrl: "avatars/c/antigo.png",
        uploadedPath: undefined,
        hasPreview: true,
      }),
    ).toEqual({});
  });

  it("nunca teve avatar: não manda o campo", () => {
    expect(
      buildAvatarUpdate({
        savedAvatarUrl: null,
        uploadedPath: undefined,
        hasPreview: false,
      }),
    ).toEqual({});
  });
});
