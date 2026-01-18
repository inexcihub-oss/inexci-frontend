import api from "@/lib/api";

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export const supplierService = {
  /**
   * Busca todos os fornecedores
   */
  async getAll(): Promise<Supplier[]> {
    try {
      const response = await api.get("/suppliers");
      return response.data.records || response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um fornecedor específico por ID
   */
  async getById(supplierId: string): Promise<Supplier> {
    try {
      const response = await api.get(`/suppliers/${supplierId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cria um novo fornecedor
   */
  async create(payload: CreateSupplierPayload): Promise<Supplier> {
    try {
      const response = await api.post("/suppliers", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Atualiza um fornecedor
   */
  async update(
    supplierId: string,
    payload: Partial<CreateSupplierPayload>
  ): Promise<Supplier> {
    try {
      const response = await api.patch(`/suppliers/${supplierId}`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Deleta um fornecedor
   */
  async delete(supplierId: string): Promise<void> {
    try {
      await api.delete(`/suppliers/${supplierId}`);
    } catch (error) {
      throw error;
    }
  },
};
