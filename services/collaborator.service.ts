import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";
import { DoctorProfile, DoctorSummary } from "@/types";
import { Permission } from "@/lib/permissions";

export interface Collaborator {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  document?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  status?: string;
  isDoctor?: boolean;
  doctorProfile?: DoctorProfile;
  /** Permissão **efetiva**, já derivada no backend (inclui as travadas do médico). Só para EXIBIR. */
  permissions?: Permission[];
  /**
   * Permissão **crua** (o que foi de fato concedido, sem o bônus de médico).
   * É este campo que deve semear um formulário de edição e voltar no PATCH —
   * usar `permissions` (efetiva) para isso regravaria como concessão real o
   * que só valia por causa de `doctor_profile` (I2 do
   * PLANO-PERMISSOES-COLABORADORES). Só vem preenchido em respostas de
   * rotas de gestão de colaborador (`ADMINISTRACAO`); nunca em `/auth/me`
   * ou `/users/profile`.
   */
  grantedPermissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Doctor extends DoctorSummary {
  avatarUrl?: string;
  gender?: string;
  birthDate?: string;
  document?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollaboratorPayload {
  name: string;
  email: string;
  phone?: string;
  isDoctor?: boolean;
  crm?: string;
  crmState?: string;
  specialty?: string;
  permissions?: Permission[];
}

interface BackendUserRecord {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  cpf?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  status?: string;
  isDoctor?: boolean;
  doctorProfile?: DoctorProfile;
  permissions?: Permission[];
  grantedPermissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

function toCollaborator(user: BackendUserRecord): Collaborator {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    birthDate: user.birthDate,
    document: user.cpf,
    cep: user.cep,
    address: user.address,
    addressNumber: user.addressNumber,
    addressComplement: user.addressComplement,
    city: user.city,
    state: user.state,
    status: user.status,
    isDoctor: user.isDoctor || !!user.doctorProfile,
    doctorProfile: user.doctorProfile || undefined,
    permissions: user.permissions,
    grantedPermissions: user.grantedPermissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// `toDoctor` saiu com `getDoctors`/`getDoctorById`, seus únicos chamadores. O
// tipo `Doctor` continua exportado — a tela de colaborador e o
// `availableDoctorsService` usam.

export const collaboratorService = {
  /**
   * Busca todos os colaboradores/assistentes
   */
  async getAll(): Promise<Collaborator[]> {
    const response = await api.get("/users/collaborators");
    const data = getApiRecords<BackendUserRecord>(response.data);
    return data.map(toCollaborator);
  },

  /**
   * Busca um colaborador específico por ID, para a tela de edição do admin.
   *
   * Usa `GET /users/collaborators/:id` (gated por `ADMINISTRACAO`), não
   * `GET /users/one` (rota genérica, sem gate de permissão, compartilhada
   * com o autoatendimento e a visão do médico sobre seus colaboradores) —
   * só a primeira devolve `grantedPermissions` (a coluna crua, necessária
   * para editar sem regravar o bônus de médico como concessão real; ver I2
   * do PLANO-PERMISSOES-COLABORADORES).
   */
  async getById(collaboratorId: string): Promise<Collaborator | null> {
    const response = await api.get<BackendUserRecord>(
      `/users/collaborators/${collaboratorId}`,
    );
    return toCollaborator(response.data);
  },

  /**
   * Cria um novo colaborador
   */
  async create(payload: CreateCollaboratorPayload): Promise<Collaborator> {
    const response = await api.post("/users/collaborators", payload);
    return response.data;
  },

  /**
   * Atualiza um colaborador
   */
  async update(
    collaboratorId: string,
    payload: Partial<CreateCollaboratorPayload>,
  ): Promise<Collaborator> {
    const response = await api.patch(
      `/users/collaborators/${collaboratorId}`,
      payload,
    );
    return response.data;
  },

  /**
   * Atualiza o perfil de um colaborador ou médico via PATCH /users/:id
   */
  async updateProfile(
    userId: string,
    payload: {
      name?: string;
      phone?: string;
      specialty?: string;
      gender?: string;
      birthDate?: string;
      cpf?: string;
      cep?: string;
      address?: string;
      addressNumber?: string;
      addressComplement?: string;
      city?: string;
      state?: string;
    },
  ): Promise<Collaborator> {
    const response = await api.patch(`/users/${userId}`, payload);
    return response.data;
  },

  /**
   * Alterna o status ativo/inativo de um colaborador
   */
  async toggleStatus(collaboratorId: string): Promise<{ status: string }> {
    const response = await api.patch(
      `/users/collaborators/${collaboratorId}/status`,
    );
    return response.data;
  },

  /**
   * Redefine a senha de um colaborador
   */
  async resetPassword(
    collaboratorId: string,
    password: string,
  ): Promise<{ message: string }> {
    const response = await api.patch(
      `/users/collaborators/${collaboratorId}/reset-password`,
      { password },
    );
    return response.data;
  },

  /**
   * Reenvia o e-mail de convite (link de primeiro acesso) para um colaborador
   * com status pendente. Gera um novo token válido por 72h.
   */
  async resendInvite(
    collaboratorId: string,
  ): Promise<{ message: string; email: string }> {
    const response = await api.post(
      `/users/collaborators/${collaboratorId}/resend-invite`,
    );
    return response.data;
  },

  /**
   * Deleta um colaborador
   */
  async delete(collaboratorId: string): Promise<void> {
    await api.delete(`/users/collaborators/${collaboratorId}`);
  },

  async deleteMany(collaboratorIds: string[]): Promise<void> {
    if (!collaboratorIds.length) return;
    await api.post("/users/collaborators/bulk-delete", {
      ids: collaboratorIds,
    });
  },

  // `getDoctors` e `getDoctorById` foram removidos: nenhuma tela os chamava.
  // Quem lista médicos usa `availableDoctorsService.getDoctorsForAccount()`,
  // que consome a mesma `/users/doctors` e já reduz ao que os seletores
  // exibem. `getDoctorById` era o último chamador de `/users/one`.
};
