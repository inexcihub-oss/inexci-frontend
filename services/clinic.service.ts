import api, { FETCH_ALL_TAKE } from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";
import {
  BusinessHours,
  normalizeBusinessHours,
} from "@/lib/business-hours";

export interface Clinic {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  businessHours: BusinessHours;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicPayload {
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  businessHours?: BusinessHours;
}

interface BackendClinic extends Omit<Clinic, "businessHours"> {
  businessHours?: Partial<BusinessHours> | null;
}

/**
 * Normaliza a grade na borda: da porta para dentro do app, `businessHours`
 * sempre tem os sete dias, e nenhum componente precisa de `?? []`.
 */
function mapClinic(c: BackendClinic): Clinic {
  return {
    ...c,
    businessHours: normalizeBusinessHours(c.businessHours),
  };
}

export const clinicService = {
  async getAll(): Promise<Clinic[]> {
    const response = await api.get("/clinics", {
      params: { take: FETCH_ALL_TAKE },
    });
    return getApiRecords<BackendClinic>(response.data).map(mapClinic);
  },

  async getById(clinicId: string): Promise<Clinic> {
    const response = await api.get<BackendClinic>(`/clinics/${clinicId}`);
    return mapClinic(response.data);
  },

  async create(payload: CreateClinicPayload): Promise<Clinic> {
    const response = await api.post<BackendClinic>("/clinics", payload);
    return mapClinic(response.data);
  },

  async update(
    clinicId: string,
    payload: Partial<CreateClinicPayload>,
  ): Promise<Clinic> {
    const response = await api.patch<BackendClinic>(
      `/clinics/${clinicId}`,
      payload,
    );
    return mapClinic(response.data);
  },

  async delete(clinicId: string): Promise<void> {
    await api.delete(`/clinics/${clinicId}`);
  },

  async deleteMany(clinicIds: string[]): Promise<void> {
    if (!clinicIds.length) return;
    await api.post("/clinics/bulk-delete", { ids: clinicIds });
  },
};
