const ALL = ["clinical-records"] as const;

export const clinicalRecordKeys = {
  all: ALL,
  byPatient: (patientId: string) => [...ALL, "patient", patientId] as const,
};

const SNIPPETS = ["clinical-snippets"] as const;

export const clinicalSnippetKeys = {
  all: SNIPPETS,
  mine: (userId: string | null) => [...SNIPPETS, userId ?? "anonimo"] as const,
};
