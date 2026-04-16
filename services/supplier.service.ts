import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  zip_code?: string;
  address?: string;
  address_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  name?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  zip_code?: string;
  address?: string;
  address_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

interface BackendSupplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  zip_code?: string;
  address?: string;
  address_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  created_at: string;
  updated_at: string;
}

export const supplierService = {
  /**
   * Busca todos os fornecedores
   */
  async getAll(): Promise<Supplier[]> {
    const response = await api.get("/suppliers");
    const data = getApiRecords<BackendSupplier>(response.data);

    // Mapeia os campos do backend para o frontend
    return data.map((s) => ({
      id: s.id,
      name: s.name,
      cnpj: s.cnpj,
      phone: s.phone,
      email: s.email,
      contact_name: s.contact_name,
      contact_phone: s.contact_phone,
      contact_email: s.contact_email,
      zip_code: s.zip_code,
      address: s.address,
      address_number: s.address_number,
      neighborhood: s.neighborhood,
      city: s.city,
      state: s.state,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  },

  /**
   * Busca um fornecedor específico por ID
   * Como o backend não tem endpoint getById, buscamos todos e filtramos
   */
  async getById(supplierId: string): Promise<Supplier | null> {
    const allSuppliers = await this.getAll();
    return (
      allSuppliers.find((s) => String(s.id) === String(supplierId)) || null
    );
  },

  /**
   * Cria um novo fornecedor
   */
  async create(payload: CreateSupplierPayload): Promise<Supplier> {
    const response = await api.post("/suppliers", payload);
    return response.data;
  },

  /**
   * Atualiza um fornecedor
   */
  async update(
    supplierId: string,
    payload: Partial<CreateSupplierPayload>,
  ): Promise<Supplier> {
    const response = await api.patch(`/suppliers/${supplierId}`, payload);
    return response.data;
  },

  /**
   * Deleta um fornecedor
   */
  async delete(supplierId: string): Promise<void> {
    await api.delete(`/suppliers/${supplierId}`);
  },
};
