import api from "@/lib/api";

export interface CidItem {
  id: string;
  description: string;
}

export interface CidSearchResponse {
  total: number;
  records: CidItem[];
}

export const cidService = {
  async search(search?: string, take: number = 50): Promise<CidSearchResponse> {
    const params: Record<string, string | number> = { take };
    if (search && search.length >= 2) {
      params.search = search;
    }
    const response = await api.get("/surgery-requests/cid", { params });
    return response.data;
  },
};
