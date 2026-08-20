import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Permission } from "@/lib/permissions";

const push = vi.fn();

let authState = {
  permissions: [Permission.ADMINISTRACAO] as Permission[],
  can: (p: Permission) => authState.permissions.includes(p),
  isAdmin: true,
  isDoctor: false,
};

const clinics = [
  {
    id: "clinic-1",
    name: "Unidade Centro",
    phone: "(11) 99999-0000",
    city: "São Paulo",
    state: "SP",
    businessHours: {
      sun: [],
      mon: [{ start: "08:00", end: "12:00" }],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
    },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
];

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/useClinics", () => ({
  CLINICS_QUERY_KEY: ["clinics"],
  useClinics: () => ({ data: clinics, isLoading: false }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}));

import ClinicasPage from "./page";

describe("Página de clínicas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.permissions = [Permission.ADMINISTRACAO];
  });

  it("lista as clínicas da conta", () => {
    render(<ClinicasPage />);
    expect(screen.getByText("Unidade Centro")).toBeInTheDocument();
  });

  it("esconde o botão de cadastrar de quem não tem administração", () => {
    authState.permissions = [Permission.AGENDA];
    render(<ClinicasPage />);
    expect(screen.queryByText(/nova clínica/i)).not.toBeInTheDocument();
  });
});
