export const mockSurgeryRequestListItem = {
  id: 1,
  status: 1,
  protocol: "000001",
  priority: 2,
  created_at: "2026-04-01T10:00:00.000Z",
  patient: { id: "pat-001", name: "João Silva" },
  doctor: { id: "user-admin-001", name: "Dr. Admin Teste" },
  health_plan: { id: "hp-001", name: "Unimed" },
  hospital: { id: "hosp-001", name: "Hospital Central" },
  procedure: { id: "proc-001", name: "Artroscopia de Joelho" },
  tuss_procedure: null,
  pendencies_count: 2,
};

export const mockSurgeryRequestSentItem = {
  ...mockSurgeryRequestListItem,
  id: 2,
  status: 2,
  protocol: "000002",
  patient: { id: "pat-002", name: "Maria Souza" },
  pendencies_count: 0,
};

export const mockSurgeryRequestListResponse = [
  mockSurgeryRequestListItem,
  mockSurgeryRequestSentItem,
];

export const mockSurgeryRequestDetail = {
  id: 1,
  status: 1,
  protocol: "000001",
  priority: 2,
  created_at: "2026-04-01T10:00:00.000Z",
  updated_at: "2026-04-01T10:00:00.000Z",
  observations: "Observações de teste para a solicitação",
  procedure_name: "Artroscopia de Joelho",
  patient: {
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
  },
  doctor: {
    id: "user-admin-001",
    name: "Dr. Admin Teste",
    email: "admin@inexci.com",
    phone: "(11) 99999-0001",
    doctor_profile: {
      crm: "CRM12345",
      specialty: "Ortopedia",
      crm_state: "SP",
      signature_url: null,
    },
  },
  hospital: {
    id: "hosp-001",
    name: "Hospital Central",
    address: "Av. Hospital, 500",
  },
  health_plan: { id: "hp-001", name: "Unimed", email: "unimed@email.com" },
  procedure: { id: "proc-001", name: "Artroscopia de Joelho" },
  tuss_procedure: null,
  tuss_items: [],
  opme_items: [],
  documents: [],
  sections: [],
  activities: [],
  contestations: [],
  pendencies: [],
  analysis: null,
  billing: null,
  receipt: null,
  scheduling: null,
  pendencies_summary: {
    total: 2,
    completed: 0,
    pending: 2,
    waiting: 0,
    optional: 0,
    canTransition: false,
  },
  cid_id: null,
  cid_description: null,
  health_plan_registration: "REG-12345",
  health_plan_type: "Enfermaria",
  hospital_id: "hosp-001",
  has_opme: false,
  surgery_date: null,
  surgery_performed_at: null,
  diagnosis: null,
  medical_report: null,
  patient_history: null,
};

export const mockSurgeryRequestSentDetail = {
  ...mockSurgeryRequestDetail,
  id: 2,
  status: 2,
  protocol: "000002",
};

export const mockCreateSurgeryRequestResponse = {
  id: 99,
  status: 1,
  protocol: null,
};

export const mockActivity = {
  id: "act-001",
  content: "Comentário de teste adicionado",
  created_at: "2026-04-28T10:00:00.000Z",
  user: { id: "user-admin-001", name: "Dr. Admin Teste" },
};
