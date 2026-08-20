/**
 * Decide o que a etapa 1 do cadastro faz com o resultado das checagens de
 * disponibilidade de e-mail e telefone.
 *
 * Vive fora da página por dois motivos: a regra tem casos suficientes para
 * merecer teste próprio (dois campos, três status, falha de rede), e a decisão
 * "bloqueia ou não" precisa ser óbvia de auditar — é ela que segura o usuário
 * na etapa em que ainda dá para corrigir o dado.
 *
 * `null` significa "não deu para checar" (rede caiu, endpoint falhou, throttle
 * estourou). Nesse caso a etapa NÃO bloqueia: a checagem é uma comodidade, e o
 * submit revalida de qualquer jeito — travar o cadastro por indisponibilidade
 * de um endpoint auxiliar seria pior que o problema que ele resolve.
 */
export type EmailAvailability =
  | "available"
  | "pending_invite"
  | "registered"
  | null;

export type PhoneAvailability = "available" | "registered" | null;

export interface Step1AvailabilityResult {
  /** Impede avançar para a etapa 2. */
  blocked: boolean;
  /** Mensagens a exibir sob cada campo. */
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
