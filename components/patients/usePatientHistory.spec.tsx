import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { Permission } from "@/lib/permissions";

const getAll = vi.hoisted(() => vi.fn());
const getByPatientAppointments = vi.hoisted(() => vi.fn());
const getByPatientRecords = vi.hoisted(() => vi.fn());
const listDocuments = vi.hoisted(() => vi.fn());
const getAvailableDoctors = vi.hoisted(() => vi.fn());
let permissions: Permission[] = [];

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: { getAll: (...a: unknown[]) => getAll(...a) },
}));
vi.mock("@/services/appointment.service", () => ({
  appointmentService: {
    getByPatient: (...a: unknown[]) => getByPatientAppointments(...a),
  },
}));
vi.mock("@/services/clinical-record.service", () => ({
  clinicalRecordService: {
    getByPatient: (...a: unknown[]) => getByPatientRecords(...a),
  },
}));
vi.mock("@/services/document.service", () => ({
  patientDocumentService: { list: (...a: unknown[]) => listDocuments(...a) },
}));
vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: {
    getAvailableDoctors: (...a: unknown[]) => getAvailableDoctors(...a),
  },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    permissions,
    can: (p: Permission) => permissions.includes(p),
  }),
}));

import { usePatientHistory } from "./usePatientHistory";

beforeEach(() => {
  vi.clearAllMocks();
  getAll.mockResolvedValue({ total: 1, records: [{ id: "sc-1" }] });
  getByPatientAppointments.mockResolvedValue([]);
  getByPatientRecords.mockResolvedValue([]);
  listDocuments.mockResolvedValue([]);
  getAvailableDoctors.mockResolvedValue([]);
});

describe("usePatientHistory — cirurgias só com permissão", () => {
  it("só com AGENDA não pede as cirurgias (o backend responderia 403)", async () => {
    permissions = [Permission.AGENDA];
    const { result } = renderHook(() => usePatientHistory("pac-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getAll).not.toHaveBeenCalled();
    expect(result.current.surgeries).toEqual([]);
    expect(result.current.error).toBe(false);
  });

  it.each([[Permission.SOLICITACOES], [Permission.ATENDIMENTO]])(
    "com %s pede as cirurgias do paciente",
    async (permissao) => {
      permissions = [permissao];
      const { result } = renderHook(() => usePatientHistory("pac-1"));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(getAll).toHaveBeenCalledWith({ patientId: "pac-1" });
      expect(result.current.surgeries).toEqual([{ id: "sc-1" }]);
    },
  );
});
