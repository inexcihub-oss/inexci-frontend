/**
 * Classificação do erro de cadastro devolvido pelo backend (`POST /auth/register`).
 *
 * Existe separada da página porque a ordem dos testes importa e é sutil: a
 * mensagem de telefone ("Este telefone já está sendo utilizado...") contém
 * "já está", que antes casava com o ramo de e-mail e fazia a tela oferecer
 * "Fazer login" / "Recuperar senha" para quem só precisava trocar o número.
 */
export type RegisterErrorType =
  | "email_active"
  | "email_pending"
  | "phone_active"
  | "generic";

export function classifyRegisterError(message: string): RegisterErrorType {
  if (message.includes("convite pendente")) return "email_pending";
  // Antes de qualquer teste de e-mail — ver comentário do topo.
  if (message.includes("telefone já está sendo utilizado")) {
    return "phone_active";
  }
  if (message.includes("já está cadastrado")) return "email_active";
  return "generic";
}
