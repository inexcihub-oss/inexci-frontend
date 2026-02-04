import api from "@/lib/api";

export interface Cid {
  id: string;
  description: string;
}

export const cidService = {
  /**
   * Busca todos os CIDs
   */
  async getAll(): Promise<Cid[]> {
    try {
      const response = await api.get("/surgery-requests/cid");
      const data = response.data.records || response.data;
      return data.map((cid: any) => ({
        id: cid.id,
        description: cid.description,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca CIDs com filtro de pesquisa
   */
  async search(searchTerm: string): Promise<Cid[]> {
    try {
      const response = await api.get("/surgery-requests/cid", {
        params: { search: searchTerm },
      });
      const data = response.data.records || response.data;
      return data.map((cid: any) => ({
        id: cid.id,
        description: cid.description,
      }));
    } catch (error) {
      throw error;
    }
  },
};
