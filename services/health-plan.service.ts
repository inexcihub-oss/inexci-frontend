import type { ApiSchema } from "@/types/api";
import { createCrudService } from "@/services/crud-service";

export interface HealthPlan {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  ansCode?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  authorizationContact?: string;
  authorizationPhone?: string;
  authorizationEmail?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateHealthPlanPayload = ApiSchema<"CreateHealthPlanDto">;

export const healthPlanService = createCrudService<
  HealthPlan,
  CreateHealthPlanPayload
>("/health_plans");
