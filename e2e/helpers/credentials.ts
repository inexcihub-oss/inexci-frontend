export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3002";

export const DOCTOR = {
  email: process.env.E2E_DOCTOR_EMAIL ?? "medico@inexci.com",
  password: process.env.E2E_DOCTOR_PASSWORD ?? "Teste123@",
};

export const DOCTOR_STORAGE_STATE = "e2e/.auth/medico.json";
