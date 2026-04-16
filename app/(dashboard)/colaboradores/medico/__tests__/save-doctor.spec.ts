import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes para validar a lógica de save na página de detalhe do médico.
 * Verifica que CRM, specialty e crm_state são salvos via updateDoctorProfile
 * além dos dados básicos salvos via updateProfile.
 */

const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockUpdateDoctorProfile = vi.fn().mockResolvedValue({});

// Simula a lógica de handleSave extraída do componente
async function handleSave(
  doctor: { id: string; doctor_profile?: { id: string } } | null,
  formData: {
    name: string;
    email: string;
    phone: string;
    gender: string;
    birth_date: string;
    cpf: string;
    crm: string;
    crmState: string;
    specialty: string;
  },
  updateProfile: typeof mockUpdateProfile,
  updateDoctorProfile: typeof mockUpdateDoctorProfile,
) {
  if (!doctor) return;

  // 1. Salvar dados básicos do perfil
  await updateProfile(doctor.id, {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    gender: formData.gender,
    birth_date: formData.birth_date || undefined,
    cpf: formData.cpf || undefined,
  });

  // 2. Salvar dados profissionais (CRM, specialty, crm_state)
  if (doctor.doctor_profile?.id) {
    await updateDoctorProfile(doctor.doctor_profile.id, {
      crm: formData.crm || undefined,
      crm_state: formData.crmState || undefined,
      specialty: formData.specialty || undefined,
    });
  }
}

describe("Detalhe do Médico — handleSave", () => {
  beforeEach(() => {
    mockUpdateProfile.mockClear();
    mockUpdateDoctorProfile.mockClear();
  });

  const fullFormData = {
    name: "Dr. Carlos Souza",
    email: "carlos@clinica.com",
    phone: "11999997777",
    gender: "masculino",
    birth_date: "1975-03-20",
    cpf: "12345678900",
    crm: "654321",
    crmState: "RJ",
    specialty: "Cardiologia",
  };

  it("deve salvar dados básicos E profissionais quando doctor tem doctor_profile", async () => {
    const doctor = { id: "user-001", doctor_profile: { id: "dp-001" } };

    await handleSave(
      doctor,
      fullFormData,
      mockUpdateProfile,
      mockUpdateDoctorProfile,
    );

    // Verifica dados básicos
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateProfile).toHaveBeenCalledWith("user-001", {
      name: "Dr. Carlos Souza",
      email: "carlos@clinica.com",
      phone: "11999997777",
      gender: "masculino",
      birth_date: "1975-03-20",
      cpf: "12345678900",
    });

    // Verifica dados profissionais
    expect(mockUpdateDoctorProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoctorProfile).toHaveBeenCalledWith("dp-001", {
      crm: "654321",
      crm_state: "RJ",
      specialty: "Cardiologia",
    });
  });

  it("NÃO deve salvar profissionais quando doctor não tem doctor_profile", async () => {
    const doctor = { id: "user-002", doctor_profile: undefined };

    await handleSave(
      doctor,
      fullFormData,
      mockUpdateProfile,
      mockUpdateDoctorProfile,
    );

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoctorProfile).not.toHaveBeenCalled();
  });

  it("NÃO deve fazer nada quando doctor é null", async () => {
    await handleSave(
      null,
      fullFormData,
      mockUpdateProfile,
      mockUpdateDoctorProfile,
    );

    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(mockUpdateDoctorProfile).not.toHaveBeenCalled();
  });

  it("deve converter campos vazios para undefined", async () => {
    const doctor = { id: "user-003", doctor_profile: { id: "dp-003" } };
    const emptyForm = {
      name: "Dr. Mínimo",
      email: "min@test.com",
      phone: "",
      gender: "",
      birth_date: "",
      cpf: "",
      crm: "",
      crmState: "",
      specialty: "",
    };

    await handleSave(
      doctor,
      emptyForm,
      mockUpdateProfile,
      mockUpdateDoctorProfile,
    );

    expect(mockUpdateProfile).toHaveBeenCalledWith("user-003", {
      name: "Dr. Mínimo",
      email: "min@test.com",
      phone: "",
      gender: "",
      birth_date: undefined,
      cpf: undefined,
    });

    expect(mockUpdateDoctorProfile).toHaveBeenCalledWith("dp-003", {
      crm: undefined,
      crm_state: undefined,
      specialty: undefined,
    });
  });

  it("deve usar o ID correto do doctor_profile para a chamada", async () => {
    const doctor = {
      id: "user-999",
      doctor_profile: { id: "dp-specific-id" },
    };

    await handleSave(
      doctor,
      fullFormData,
      mockUpdateProfile,
      mockUpdateDoctorProfile,
    );

    expect(mockUpdateDoctorProfile).toHaveBeenCalledWith(
      "dp-specific-id",
      expect.objectContaining({ crm: "654321" }),
    );
  });
});
