export const mockUser = {
  id: "user-admin-001",
  name: "Dr. Admin Teste",
  email: "admin@inexci.com",
  cpf: "12345678900",
  status: 1,
  phone: "(11) 99999-0001",
  role: "admin" as const,
  account_id: "user-admin-001",
  avatar_url: null,
  is_doctor: true,
  doctor_profile: {
    id: "dp-001",
    user_id: "user-admin-001",
    crm: "CRM12345",
    crm_state: "SP",
    specialty: "Ortopedia",
    signature_url: null,
    clinic_name: "Clínica Teste",
    clinic_cnpj: null,
    clinic_address: null,
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockLoginSuccessResponse = {
  access_token: "mock-jwt-token-valid-12345",
  refresh_token: "mock-refresh-token-12345",
  user: mockUser,
};

export const mockLoginErrorResponse = {
  statusCode: 401,
  message: "Credenciais inválidas.",
  error: "Unauthorized",
};

export const mockMeResponse = mockUser;

export const VALID_CREDENTIALS = {
  email: "admin@inexci.com",
  password: "123456",
};

export const INVALID_CREDENTIALS = {
  email: "admin@inexci.com",
  password: "senha-errada",
};
