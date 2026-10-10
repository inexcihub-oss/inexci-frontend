import api from "@/lib/api";
import { createCrudService, createGetById } from "@/services/crud-service";
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

export type CreateClinicPayload = Omit<
  Clinic,
  "id" | "createdAt" | "updatedAt" | "businessHours"
> & { businessHours?: BusinessHours };

export interface ClinicRoom {
  id: string;
  clinicId: string;
  name: string;
  active: boolean;
}

interface BackendClinic extends Omit<Clinic, "businessHours"> {
  businessHours?: Partial<BusinessHours> | null;
}

function mapClinic(c: BackendClinic): Clinic {
  return {
    ...c,
    businessHours: normalizeBusinessHours(c.businessHours),
  };
}

export const clinicService = {
  ...createCrudService<Clinic, CreateClinicPayload, BackendClinic>(
    "/clinics",
    mapClinic,
  ),
  getById: createGetById<Clinic, BackendClinic>("/clinics", mapClinic),

  async listRooms(clinicId: string): Promise<ClinicRoom[]> {
    const response = await api.get<ClinicRoom[]>(`/clinics/${clinicId}/rooms`);
    return response.data ?? [];
  },

  async createRoom(clinicId: string, name: string): Promise<ClinicRoom> {
    const response = await api.post<ClinicRoom>(`/clinics/${clinicId}/rooms`, {
      name,
    });
    return response.data;
  },

  async updateRoom(
    clinicId: string,
    roomId: string,
    payload: { name?: string; active?: boolean },
  ): Promise<ClinicRoom> {
    const response = await api.patch<ClinicRoom>(
      `/clinics/${clinicId}/rooms/${roomId}`,
      payload,
    );
    return response.data;
  },

  async deleteRoom(clinicId: string, roomId: string): Promise<void> {
    await api.delete(`/clinics/${clinicId}/rooms/${roomId}`);
  },
};
