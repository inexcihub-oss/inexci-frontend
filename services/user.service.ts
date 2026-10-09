import api from "@/lib/api";
import type { ProfessionalCouncil } from "@/lib/professional-council";
import { DoctorProfile } from "@/types";
import { uploadService } from "@/services/upload.service";

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
  avatarUrl?: string | null;
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

export const userService = {
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
          expiresAt: Date.now() + 2000,
        };
        return response.data;
      })
      .finally(() => {
        profileInFlight = null;
      });

    return profileInFlight;
  },

  async updateProfile(data: UpdateProfileData): Promise<UserProfileResponse> {
    invalidateProfileCache();
    const response = await api.put<UserProfileResponse>("/users/profile", data);
    if (response.data && typeof response.data.isDoctor === "boolean") {
      profileCache = {
        data: response.data,
        expiresAt: Date.now() + 2000,
      };
    }
    return response.data;
  },

  async updateDoctorProfile(
    doctorProfileId: string,
    data: {
      council?: ProfessionalCouncil;
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

  async uploadAvatar(file: File): Promise<UserProfileResponse> {
    const uploadResponse = await uploadService.uploadSingle(file, "avatars");
    const avatarUrl = uploadResponse.data.url;
    return this.updateProfile({ avatarUrl });
  },
};
