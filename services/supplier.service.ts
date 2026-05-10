import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

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
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  active: boolean;
  quotations?: SupplierQuotation[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  name?: string;
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
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  active?: boolean;
}

function mapSupplier(s: Record<string, unknown>): Supplier {
  return {
    id: s.id as string,
    name: s.name as string,
    cnpj: s.cnpj as string | undefined,
    phone: s.phone as string | undefined,
    email: s.email as string | undefined,
    website: s.website as string | undefined,
    category: s.category as string | undefined,
    paymentTerms: s.paymentTerms as string | undefined,
    deliveryTime: s.deliveryTime as string | undefined,
    contactName: s.contactName as string | undefined,
    contactPhone: s.contactPhone as string | undefined,
    contactEmail: s.contactEmail as string | undefined,
    zipCode: s.zipCode as string | undefined,
    address: s.address as string | undefined,
    addressNumber: s.addressNumber as string | undefined,
    neighborhood: s.neighborhood as string | undefined,
    city: s.city as string | undefined,
    state: s.state as string | undefined,
    notes: s.notes as string | undefined,
    active: (s.active as boolean) ?? true,
    quotations: s.quotations as SupplierQuotation[] | undefined,
    createdAt: s.createdAt as string,
    updatedAt: s.updatedAt as string,
  };
}

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const response = await api.get("/suppliers");
    const data = getApiRecords<Record<string, unknown>>(response.data);
    return data.map(mapSupplier);
  },

  async getById(supplierId: string): Promise<Supplier | null> {
    const response = await api.get(`/suppliers/${supplierId}`);
    return mapSupplier(response.data as Record<string, unknown>);
  },

  async create(payload: CreateSupplierPayload): Promise<Supplier> {
    const response = await api.post("/suppliers", payload);
    return response.data;
  },

  async update(
    supplierId: string,
    payload: Partial<CreateSupplierPayload>,
  ): Promise<Supplier> {
    const response = await api.patch(`/suppliers/${supplierId}`, payload);
    return response.data;
  },

  async delete(supplierId: string): Promise<void> {
    await api.delete(`/suppliers/${supplierId}`);
  },
};
