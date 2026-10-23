import api from "@/lib/api";

export interface ClinicalSnippet {
  id: string;
  doctorId: string;
  shortcut: string;
  title: string;
  content: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalSnippetPayload {
  shortcut: string;
  title: string;
  content: string;
}

export const SNIPPET_SHORTCUT_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function normalizarAtalho(valor: string): string {
  return valor
    .trim()
    .replace(/^\/+/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s_]+/g, "-");
}

export const clinicalSnippetService = {
  async getAll(): Promise<ClinicalSnippet[]> {
    const response = await api.get<ClinicalSnippet[]>(
      "/clinical-records/snippets",
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  async create(payload: ClinicalSnippetPayload): Promise<ClinicalSnippet> {
    const response = await api.post<ClinicalSnippet>(
      "/clinical-records/snippets",
      payload,
    );
    return response.data;
  },

  async update(
    id: string,
    payload: Partial<ClinicalSnippetPayload>,
  ): Promise<ClinicalSnippet> {
    const response = await api.patch<ClinicalSnippet>(
      `/clinical-records/snippets/${id}`,
      payload,
    );
    return response.data;
  },

  async registerUse(id: string): Promise<void> {
    await api.post<void>(`/clinical-records/snippets/${id}/use`);
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`/clinical-records/snippets/${id}`);
  },
};
