interface ApiCollectionResponse<T> {
  records?: T[];
}

/**
 * Normaliza respostas de lista do backend:
 * - { records: T[] }
 * - T[]
 */
export function getApiRecords<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const maybeCollection = payload as ApiCollectionResponse<T>;
    if (Array.isArray(maybeCollection.records)) {
      return maybeCollection.records;
    }
  }

  return [];
}
