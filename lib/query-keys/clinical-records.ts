const ALL = ["clinical-records"] as const;

export const clinicalRecordKeys = {
  all: ALL,
  byPatient: (patientId: string) => [...ALL, "patient", patientId] as const,
};

export const clinicalSnippetKeys = {
  all: [...ALL, "snippets"] as const,
  byDoctor: (doctorId: string | null) =>
    [...ALL, "snippets", doctorId ?? "me"] as const,
};
