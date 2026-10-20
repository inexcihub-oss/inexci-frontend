import type { ApiSchema } from "@/types/api";
import { createCrudService, createGetById } from "@/services/crud-service";

export interface Manufacturer {
  id: string;
  name: string;
  cnpj?: string;
  anvisaRegistration?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateManufacturerPayload = ApiSchema<"CreateManufacturerDto">;

export const manufacturerService = {
  ...createCrudService<Manufacturer, CreateManufacturerPayload>(
    "/manufacturers",
  ),
  getById: createGetById<Manufacturer>("/manufacturers"),
};
