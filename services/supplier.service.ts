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
      const data = response.data.records || response.data;
      // Mapeia os campos do backend para o frontend
      return data.map((user: any) => ({
        id: user.id,
        name: user.name,
        cnpj: user.document, // O campo 'document' armazena CNPJ
        phone: user.phone,
        email: user.email,
        address: user.company, // O campo 'company' é usado para endereço
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um fornecedor específico por ID
   * Como o backend não tem endpoint getById, buscamos todos e filtramos
   */
  async getById(supplierId: string): Promise<Supplier | null> {
    try {
      const allSuppliers = await this.getAll();
      return (
        allSuppliers.find((s) => String(s.id) === String(supplierId)) || null
      );
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
    payload: Partial<CreateSupplierPayload>,
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
