import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes para validar a lógica de save do perfil na página de configurações.
 * Testa que dados profissionais (CRM, specialty, crm_state) são salvos
 * junto com os dados básicos quando o usuário é médico.
 */

// Mock do userService
const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockUpdateDoctorProfile = vi.fn().mockResolvedValue({});

vi.mock("@/services/user.service", () => ({
  userService: {
    getProfile: vi.fn().mockResolvedValue({
      name: "Dr. João",
      email: "joao@test.com",
      phone: "11999999999",
      is_doctor: true,
      doctor_profile: {
        id: "dp-001",
        crm: "123456",
        crm_state: "SP",
        specialty: "Ortopedia",
      },
    }),
    updateProfile: (...args: any[]) => mockUpdateProfile(...args),
    updateDoctorProfile: (...args: any[]) => mockUpdateDoctorProfile(...args),
  },
}));

// Simula a lógica de handleSaveProfile extraída do componente
async function handleSaveProfile(
  profile: {
    name: string;
    phone: string;
    document: string;
    birthDate: string;
    gender: string;
    isDoctor?: boolean;
    crm?: string;
    crmState?: string;
    specialty?: string;
  },
  user: { doctor_profile?: { id: string } } | null,
  updateProfile: typeof mockUpdateProfile,
  updateDoctorProfile: typeof mockUpdateDoctorProfile,
) {
  // 1. Salvar dados básicos do perfil
  await updateProfile({
    name: profile.name,
    phone: profile.phone || undefined,
    document: profile.document || undefined,
    birth_date: profile.birthDate || undefined,
    gender: profile.gender || undefined,
  });

  // 2. Se é médico e tem doctor_profile, salvar dados profissionais
  if (profile.isDoctor && user?.doctor_profile?.id) {
    await updateDoctorProfile(user.doctor_profile.id, {
      crm: profile.crm || undefined,
      crm_state: profile.crmState || undefined,
      specialty: profile.specialty || undefined,
    });
  }
}

describe("Configurações — handleSaveProfile", () => {
  beforeEach(() => {
    mockUpdateProfile.mockClear();
    mockUpdateDoctorProfile.mockClear();
  });

  it("deve salvar dados básicos e profissionais quando é médico", async () => {
    const profile = {
      name: "Dr. João Silva",
      phone: "11999999999",
      document: "12345678900",
      birthDate: "1980-01-15",
      gender: "masculino",
      isDoctor: true,
      crm: "123456",
      crmState: "SP",
      specialty: "Ortopedia",
    };
    const user = { doctor_profile: { id: "dp-001" } };

    await handleSaveProfile(
      profile,
      user,
      mockUpdateProfile,
      mockUpdateDoctorProfile,
    );

    // Deve chamar updateProfile com dados básicos
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      name: "Dr. João Silva",
      phone: "11999999999",
      document: "12345678900",
      birth_date: "1980-01-15",
      gender: "masculino",
    });

    // Deve chamar updateDoctorProfile com dados profissionais
    expect(mockUpdateDoctorProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoctorProfile).toHaveBeenCalledWith("dp-001", {
      crm: "123456",
      crm_state: "SP",
      specialty: "Ortopedia",
    });
  });

  it("NÃO deve chamar updateDoctorProfile quando NÃO é médico", async () => {
    const profile = {
      name: "Assistente Maria",
      phone: "21988888888",
      document: "",
      birthDate: "",
      gender: "",
      isDoctor: false,
      crm: "",
      crmState: "",
      specialty: "",
    };
    const user = { doctor_profile: undefined };

    await handleSaveProfile(
      profile,
      user,
      mockUpdateProfile,
      mockUpdateDoctorProfile,
    );

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoctorProfile).not.toHaveBeenCalled();
  });

  it("NÃO deve chamar updateDoctorProfile quando user é null", async () => {
    const profile = {
      name: "Teste",
      phone: "",
      document: "",
      birthDate: "",
      gender: "",
      isDoctor: true,
    };

    await handleSaveProfile(
      profile,
      null,
      mockUpdateProfile,
      mockUpdateDoctorProfile,
    );

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoctorProfile).not.toHaveBeenCalled();
  });

  it("NÃO deve chamar updateDoctorProfile quando doctor_profile não tem id", async () => {
    const profile = {
      name: "Dr. Sem Profile",
      phone: "",
      document: "",
      birthDate: "",
      gender: "",
      isDoctor: true,
      crm: "111111",
      crmState: "RJ",
    };
    const user = { doctor_profile: undefined };

    await handleSaveProfile(
      profile,
      user,
      mockUpdateProfile,
      mockUpdateDoctorProfile,
    );

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoctorProfile).not.toHaveBeenCalled();
  });

  it("deve converter campos vazios para undefined no payload", async () => {
    const profile = {
      name: "Dr. Mínimo",
      phone: "",
      document: "",
      birthDate: "",
      gender: "",
      isDoctor: true,
      crm: "",
      crmState: "",
      specialty: "",
    };
    const user = { doctor_profile: { id: "dp-002" } };

    await handleSaveProfile(
      profile,
      user,
      mockUpdateProfile,
      mockUpdateDoctorProfile,
    );

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      name: "Dr. Mínimo",
      phone: undefined,
      document: undefined,
      birth_date: undefined,
      gender: undefined,
    });

    expect(mockUpdateDoctorProfile).toHaveBeenCalledWith("dp-002", {
      crm: undefined,
      crm_state: undefined,
      specialty: undefined,
    });
  });
});
