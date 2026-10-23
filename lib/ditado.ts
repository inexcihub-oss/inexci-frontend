export function ditadoHabilitado(): boolean {
  return process.env.NEXT_PUBLIC_CLINICAL_DICTATION_ENABLED === "true";
}
