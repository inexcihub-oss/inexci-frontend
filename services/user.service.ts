import api from "@/lib/api";
import { DoctorProfile } from "@/types";
import { uploadService } from "@/services/upload.service";

/**
 * Resposta do endpoint /users/profile.
 * Usa string para id (UUID) consistente com a entidade User.
 */
export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  document?: string;
  birthDate?: string;
  gender?: string;
  avatarUrl?: string;
  isDoctor?: boolean;
  role?: "admin" | "collaborator";
  accountId?: string;
  status: number;
  doctorProfile?: DoctorProfile;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  document?: string;
  birthDate?: string;
  gender?: string;
  avatarUrl?: string;
  signatureUrl?: string | null;
  cpf?: string;
  specialty?: string;
  crm?: string;
  crmState?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
}

let profileCache: { data: UserProfileResponse; expiresAt: number } | null =
  null;
let profileInFlight: Promise<UserProfileResponse> | null = null;
const disableProfileCache = process.env.NODE_ENV === "test";

function invalidateProfileCache() {
  profileCache = null;
}

// `getAll` (GET /users) e `getById` (GET /users/one) foram removidos: nenhuma
// tela os chamava. O primeiro puxava o diretório do staff inteiro — dado
// pessoal de cada colega — por uma rota liberada a qualquer área autenticada.
// A gestão de equipe usa `collaboratorService`, que passa pelas rotas gated
// por `ADMINISTRACAO`.
export const userService = {
  /**
   * Busca o perfil do usuário logado
   */
  async getProfile(): Promise<UserProfileResponse> {
    if (disableProfileCache) {
      const response = await api.get<UserProfileResponse>("/users/profile");
      return response.data;
    }

    const now = Date.now();

    if (profileCache && profileCache.expiresAt > now) {
      return profileCache.data;
    }

    if (profileInFlight) {
      return profileInFlight;
    }

    profileInFlight = api
      .get<UserProfileResponse>("/users/profile")
      .then((response) => {
        profileCache = {
          data: response.data,
          // cache curto para absorver remount/StrictMode sem staleness relevante
          expiresAt: Date.now() + 2000,
        };
        return response.data;
      })
      .finally(() => {
        profileInFlight = null;
      });

    return profileInFlight;
  },

  /**
   * Atualiza o perfil do usuário logado
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfileResponse> {
    invalidateProfileCache();
    const response = await api.put<UserProfileResponse>("/users/profile", data);
    profileCache = {
      data: response.data,
      expiresAt: Date.now() + 2000,
    };
    return response.data;
  },

  /**
   * Atualiza o doctorProfile do médico logado
   */
  async updateDoctorProfile(
    doctorProfileId: string,
    data: {
      crm?: string;
      crmState?: string;
      specialty?: string;
      signatureImageUrl?: string | null;
    },
  ): Promise<DoctorProfile> {
    invalidateProfileCache();
    const response = await api.patch<DoctorProfile>(
      `/users/doctor-profile/${doctorProfileId}`,
      data,
    );
    return response.data;
  },

  /**
   * Faz upload de foto de perfil e atualiza o avatarUrl no perfil do usuário.
   * @param file Arquivo de imagem selecionado pelo usuário
   * @returns O perfil atualizado com a nova avatarUrl
   */
  async uploadAvatar(file: File): Promise<UserProfileResponse> {
    const uploadResponse = await uploadService.uploadSingle(file, "avatars");
    const avatarUrl = uploadResponse.data.url;
    return this.updateProfile({ avatarUrl });
  },
};
