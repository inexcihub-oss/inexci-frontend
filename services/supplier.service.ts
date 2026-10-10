import { createCrudService, createGetById } from "@/services/crud-service";

export interface SupplierQuotation {
  id: string;
  proposalNumber?: string;
  totalValue?: number;
  submissionDate?: string;
  selected: boolean;
  createdAt: string;
  surgeryRequest?: {
    id: string;
    patient?: { name: string };
  };
}

export interface SupplierSupplyRecord {
  surgeryRequestId: string;
  surgeryRequestProtocol?: string | null;
  patientName?: string | null;
  opmeItemId: string;
  opmeItemName: string;
  authorizedQuantity?: number | null;
  quantity: number;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  website?: string;
  category?: string;
  paymentTerms?: string;
  deliveryTime?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  quotations?: SupplierQuotation[];
  suppliedSurgeryRequests?: SupplierSupplyRecord[];
  createdAt: string;
  updatedAt: string;
}

export type CreateSupplierPayload = Partial<
  Omit<
    Supplier,
    "id" | "createdAt" | "updatedAt" | "quotations" | "suppliedSurgeryRequests"
  >
>;

export const supplierService = {
  ...createCrudService<Supplier, CreateSupplierPayload>("/suppliers"),
  getById: createGetById<Supplier>("/suppliers"),
};
