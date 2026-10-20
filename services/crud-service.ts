import api, { FETCH_ALL_TAKE } from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

export function createCrudService<T, P, Raw = T>(
  basePath: string,
  map: (raw: Raw) => T = (raw) => raw as unknown as T,
) {
  return {
    async getAll(): Promise<T[]> {
      const response = await api.get<unknown>(basePath, {
        params: { take: FETCH_ALL_TAKE },
      });
      return getApiRecords<Raw>(response.data).map(map);
    },

    async create(payload: P): Promise<T> {
      const response = await api.post<Raw>(basePath, payload);
      return map(response.data);
    },

    async update(id: string, payload: Partial<P>): Promise<T> {
      const response = await api.patch<Raw>(`${basePath}/${id}`, payload);
      return map(response.data);
    },

    async delete(id: string): Promise<void> {
      await api.delete(`${basePath}/${id}`);
    },

    async deleteMany(ids: string[]): Promise<void> {
      if (!ids.length) return;
      await api.post(`${basePath}/bulk-delete`, { ids });
    },
  };
}

export function createGetById<T, Raw = T>(
  basePath: string,
  map: (raw: Raw) => T = (raw) => raw as unknown as T,
) {
  return async (id: string): Promise<T> => {
    const response = await api.get<Raw>(`${basePath}/${id}`);
    return map(response.data);
  };
}
