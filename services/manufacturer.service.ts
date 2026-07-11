import api, { FETCH_ALL_TAKE } from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

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

export interface CreateManufacturerPayload {
  name?: string;
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
}

function mapManufacturer(m: Record<string, unknown>): Manufacturer {
  return {
    id: m.id as string,
    name: m.name as string,
    cnpj: m.cnpj as string | undefined,
    anvisaRegistration: m.anvisaRegistration as string | undefined,
    email: m.email as string | undefined,
    phone: m.phone as string | undefined,
    website: m.website as string | undefined,
    country: m.country as string | undefined,
    contactName: m.contactName as string | undefined,
    contactPhone: m.contactPhone as string | undefined,
    contactEmail: m.contactEmail as string | undefined,
    notes: m.notes as string | undefined,
    createdAt: m.createdAt as string,
    updatedAt: m.updatedAt as string,
  };
}

export const manufacturerService = {
  async getAll(): Promise<Manufacturer[]> {
    const response = await api.get("/manufacturers", {
      params: { take: FETCH_ALL_TAKE },
    });
    const data = getApiRecords<Record<string, unknown>>(response.data);
    return data.map(mapManufacturer);
  },

  async getById(manufacturerId: string): Promise<Manufacturer | null> {
    const response = await api.get(`/manufacturers/${manufacturerId}`);
    return mapManufacturer(response.data as Record<string, unknown>);
  },

  async create(payload: CreateManufacturerPayload): Promise<Manufacturer> {
    const response = await api.post("/manufacturers", payload);
    return response.data;
  },

  async update(
    manufacturerId: string,
    payload: Partial<CreateManufacturerPayload>,
  ): Promise<Manufacturer> {
    const response = await api.patch(
      `/manufacturers/${manufacturerId}`,
      payload,
    );
    return response.data;
  },

  async delete(manufacturerId: string): Promise<void> {
    await api.delete(`/manufacturers/${manufacturerId}`);
  },

  async deleteMany(manufacturerIds: string[]): Promise<void> {
    if (!manufacturerIds.length) return;
    await api.post("/manufacturers/bulk-delete", { ids: manufacturerIds });
  },
};
