import type { ApiSchema } from "@/types/api";
import { createCrudService } from "@/services/crud-service";

export interface Hospital {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateHospitalPayload = ApiSchema<"CreateHospitalDto">;

export const hospitalService = createCrudService<
  Hospital,
  CreateHospitalPayload
>("/hospitals");
