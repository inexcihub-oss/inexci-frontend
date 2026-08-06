/**
 * Credenciais e endereços do ambiente local.
 *
 * O médico é o usuário criado pelo `yarn seed` do backend; a senha padrão do
 * seed é `Teste123@`. Tudo é sobrescrevível por variável de ambiente para a
 * suíte rodar contra outro ambiente sem editar código.
 */
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3002";

export const DOCTOR = {
  email: process.env.E2E_DOCTOR_EMAIL ?? "medico@inexci.com",
  password: process.env.E2E_DOCTOR_PASSWORD ?? "Teste123@",
};

/** Arquivo de sessão gerado pelo projeto `setup`. */
export const DOCTOR_STORAGE_STATE = "e2e/.auth/medico.json";
