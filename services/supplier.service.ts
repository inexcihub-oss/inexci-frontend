import api, { FETCH_ALL_TAKE } from "@/lib/api";
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
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
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
    addressComplement: s.addressComplement as string | undefined,
    neighborhood: s.neighborhood as string | undefined,
    city: s.city as string | undefined,
    state: s.state as string | undefined,
    notes: s.notes as string | undefined,
    quotations: s.quotations as SupplierQuotation[] | undefined,
    suppliedSurgeryRequests: s.suppliedSurgeryRequests as
      | SupplierSupplyRecord[]
      | undefined,
    createdAt: s.createdAt as string,
    updatedAt: s.updatedAt as string,
  };
}

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const response = await api.get("/suppliers", {
      params: { take: FETCH_ALL_TAKE },
    });
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

  async deleteMany(supplierIds: string[]): Promise<void> {
    if (!supplierIds.length) return;
    await api.post("/suppliers/bulk-delete", { ids: supplierIds });
  },
};
