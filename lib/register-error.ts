export type RegisterErrorType =
  | "email_active"
  | "email_pending"
  | "phone_active"
  | "generic";

export function classifyRegisterError(message: string): RegisterErrorType {
  if (message.includes("convite pendente")) return "email_pending";
  if (message.includes("telefone já está sendo utilizado")) {
    return "phone_active";
  }
  if (message.includes("já está cadastrado")) return "email_active";
  return "generic";
}
