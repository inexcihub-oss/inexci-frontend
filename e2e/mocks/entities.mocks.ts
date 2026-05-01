export const mockPatient = {
  id: "pat-001",
  name: "João Silva",
  cpf: "111.111.111-11",
  birth_date: "1985-03-15",
  phone: "(11) 98888-0001",
  email: "joao@email.com",
  rg: "12345678",
  address: "Rua Teste, 100",
  zip_code: "01310-100",
  cep: "01310-100",
  created_at: "2026-01-01T00:00:00.000Z",
};

export const mockPatientsList = [
  mockPatient,
  {
    ...mockPatient,
    id: "pat-002",
    name: "Maria Souza",
    cpf: "222.222.222-22",
    email: "maria@email.com",
  },
];

export const mockHospital = {
  id: "hosp-001",
  name: "Hospital Central",
  address: "Av. Hospital, 500",
  email: "contato@hospital.com",
  phone: "(11) 3333-0001",
  created_at: "2026-01-01T00:00:00.000Z",
};

export const mockHospitalsList = [
  mockHospital,
  {
    ...mockHospital,
    id: "hosp-002",
    name: "Hospital Norte",
    email: "contato@norte.com",
  },
];

export const mockHealthPlan = {
  id: "hp-001",
  name: "Unimed",
  email: "operacional@unimed.com",
  phone: "(11) 4444-0001",
  created_at: "2026-01-01T00:00:00.000Z",
};

export const mockHealthPlansList = [
  mockHealthPlan,
  {
    ...mockHealthPlan,
    id: "hp-002",
    name: "Amil",
    email: "operacional@amil.com",
  },
];

export const mockSupplier = {
  id: "sup-001",
  name: "Fornecedor OPME Ltda",
  email: "contato@opme.com",
  phone: "(11) 5555-0001",
  cnpj: "12.345.678/0001-99",
  created_at: "2026-01-01T00:00:00.000Z",
};

export const mockCollaborator = {
  id: "collab-001",
  name: "Assistente Santos",
  email: "assistente1@inexci.com",
  role: "collaborator" as const,
  status: 1,
  account_id: "user-admin-001",
  is_doctor: false,
  doctor_profile: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const mockCollaboratorsList = [
  mockCollaborator,
  {
    ...mockCollaborator,
    id: "collab-002",
    name: "Dra. Colaboradora",
    email: "medica@inexci.com",
    is_doctor: true,
  },
];

export const mockNotification = {
  id: 1,
  title: "Solicitação atualizada",
  message: "A solicitação #000001 foi atualizada para Em Análise.",
  read: false,
  created_at: "2026-04-28T09:00:00.000Z",
  surgery_request_id: 1,
};

export const mockNotificationsList = {
  data: [
    mockNotification,
    {
      ...mockNotification,
      id: 2,
      title: "Nova pendência",
      message: "Uma nova pendência foi adicionada.",
      read: true,
    },
  ],
  total: 2,
  unread: 1,
};

export const mockDashboardData = {
  total: 10,
  by_status: {
    1: 3,
    2: 2,
    3: 1,
    4: 1,
    5: 1,
    6: 1,
    7: 1,
    8: 0,
    9: 0,
  },
  recent: [],
};
