export type EmailAvailability =
  | "available"
  | "pending_invite"
  | "registered"
  | null;

export type PhoneAvailability = "available" | "registered" | null;

export interface Step1AvailabilityResult {
  blocked: boolean;
  fieldErrors: { email?: string; phone?: string };
}

export const EMAIL_REGISTERED_MESSAGE =
  "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";

export const EMAIL_PENDING_MESSAGE =
  "Este e-mail já tem um convite pendente. Verifique sua caixa de entrada e use o link para criar sua senha.";

export const PHONE_REGISTERED_MESSAGE =
  "Este telefone já está sendo utilizado por outra conta.";

export function resolveStep1Availability(status: {
  email: EmailAvailability;
  phone: PhoneAvailability;
}): Step1AvailabilityResult {
  const fieldErrors: { email?: string; phone?: string } = {};

  if (status.email === "registered") {
    fieldErrors.email = EMAIL_REGISTERED_MESSAGE;
  } else if (status.email === "pending_invite") {
    fieldErrors.email = EMAIL_PENDING_MESSAGE;
  }

  if (status.phone === "registered") {
    fieldErrors.phone = PHONE_REGISTERED_MESSAGE;
  }

  return {
    blocked: Boolean(fieldErrors.email || fieldErrors.phone),
    fieldErrors,
  };
}
