export const registryKeys = {
  hospitals: () => ["hospitals"] as const,
  healthPlans: () => ["health-plans"] as const,
  suppliers: () => ["suppliers"] as const,
  supplier: (id: string) => ["suppliers", id] as const,
  manufacturers: () => ["manufacturers"] as const,
  manufacturer: (id: string) => ["manufacturers", id] as const,
  procedures: () => ["procedures"] as const,
  procedureTemplates: () => ["surgery-request-templates"] as const,
  clinics: () => ["clinics"] as const,
  clinicRooms: (clinicId: string) => ["clinics", clinicId, "rooms"] as const,
  patients: () => ["patients"] as const,
  collaborators: () => ["collaborators"] as const,
  availableDoctors: () => ["available-doctors"] as const,
  notifications: () => ["notifications"] as const,
};

export const REGISTRY_STALE_TIME_MS = 1000 * 60 * 20;
export const REGISTRY_GC_TIME_MS = 1000 * 60 * 30;
