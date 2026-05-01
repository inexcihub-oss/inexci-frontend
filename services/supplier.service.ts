import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

export interface SupplierQuotation {
  id: string;
  proposal_number?: string;
  total_value?: number;
  submission_date?: string;
  selected: boolean;
  created_at: string;
  surgery_request?: {
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
  payment_terms?: string;
  delivery_time?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  zip_code?: string;
  address?: string;
  address_number?: string;
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
  payment_terms?: string;
  delivery_time?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  zip_code?: string;
  address?: string;
  address_number?: string;
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
    payment_terms: s.payment_terms as string | undefined,
    delivery_time: s.delivery_time as string | undefined,
    contact_name: s.contact_name as string | undefined,
    contact_phone: s.contact_phone as string | undefined,
    contact_email: s.contact_email as string | undefined,
    zip_code: s.zip_code as string | undefined,
    address: s.address as string | undefined,
    address_number: s.address_number as string | undefined,
    neighborhood: s.neighborhood as string | undefined,
    city: s.city as string | undefined,
    state: s.state as string | undefined,
    notes: s.notes as string | undefined,
    active: (s.active as boolean) ?? true,
    quotations: s.quotations as SupplierQuotation[] | undefined,
    createdAt: s.created_at as string,
    updatedAt: s.updated_at as string,
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
