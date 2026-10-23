const ALL = ["clinical-records"] as const;

export const clinicalRecordKeys = {
  all: ALL,
  byPatient: (patientId: string) => [...ALL, "patient", patientId] as const,
};

export const clinicalSnippetKeys = {
  all: [...ALL, "snippets"] as const,
  mine: (userId: string | null) =>
    [...ALL, "snippets", userId ?? "anonimo"] as const,
};
