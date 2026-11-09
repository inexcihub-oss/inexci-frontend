export const REASON_MIN = 5;
export const REASON_MAX = 500;

export function validateReason(value: string): string | null {
  const length = value.trim().length;
  if (length < REASON_MIN) {
    return `Informe o motivo (mínimo de ${REASON_MIN} caracteres).`;
  }
  if (length > REASON_MAX) {
    return `O motivo pode ter no máximo ${REASON_MAX} caracteres.`;
  }
  return null;
}
