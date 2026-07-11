import { describe, expect, it } from "vitest";
import {
  buildLaudoPatientDisplayFields,
  buildLaudoPatientFields,
  buildLaudoDocumentPatientRows,
  chunkPatientDisplayRows,
  resolveDoctorSignatureUrl,
} from "../SurgeryRequestLaudoDocument";

describe("buildLaudoPatientFields", () => {
  it("monta apenas campos preenchidos na ordem do PDF", () => {
    const result = buildLaudoPatientFields({
      patient: {
        name: "Maria Silva",
        birthDate: "1990-05-10",
        cpf: "12345678901",
      },
      healthPlan: { name: "Unimed" },
    });

    expect(result).toEqual({
      patientName: "Maria Silva",
      patientBirthDate: "10/05/1990",
      patientCpf: "123.456.789-01",
      patientHealthPlan: "Unimed",
    });
  });

  it("retorna somente nome quando demais campos estão vazios", () => {
    const result = buildLaudoPatientDisplayFields({
      patient: {
        name: "Patrícia Gonçalves Ferraz",
      },
    });

    expect(result).toEqual([
      { label: "Nome do paciente", value: "Patrícia Gonçalves Ferraz" },
    ]);
  });

  it("inclui número da carteirinha quando preenchido na SC ou no paciente", () => {
    const result = buildLaudoPatientDisplayFields({
      patient: {
        name: "Patrícia Gonçalves Ferraz",
        cpf: "70271775106",
      },
      healthPlan: { name: "Unimed Paulistana" },
      healthPlanRegistration: "7766554433",
    });

    expect(result).toEqual(
      expect.arrayContaining([
        {
          label: "Número da carteirinha",
          value: "7766554433",
        },
      ]),
    );
  });

  it("emparelha campos em linhas fixas de duas colunas sem deslocar por ausências", () => {
    const rows = chunkPatientDisplayRows(
      buildLaudoDocumentPatientRows({
        patientName: "Patrícia Gonçalves Ferraz",
        patientBirthDate: "07/10/1988",
        patientCpf: "702.717.751-06",
        patientAddress: "Av. Paulista, 900, Bela Vista, São Paulo, SP",
        patientZipCode: "01310-100",
        patientPhone: "(11) 96500-4444",
        patientHealthPlan: "Unimed Paulistana",
        patientHealthPlanNumber: "7766554433",
      }),
    );

    expect(rows).toEqual([
      [
        { label: "Nome", value: "Patrícia Gonçalves Ferraz" },
        { label: "Data de Nascimento", value: "07/10/1988" },
      ],
      [
        { label: "CPF", value: "702.717.751-06" },
        { label: "Telefone", value: "(11) 96500-4444" },
      ],
      [
        {
          label: "Endereço",
          value: "Av. Paulista, 900, Bela Vista, São Paulo, SP",
        },
        { label: "CEP", value: "01310-100" },
      ],
      [
        { label: "Convênio", value: "Unimed Paulistana" },
        { label: "Nº da carteirinha", value: "7766554433" },
      ],
    ]);
  });

  it("resolve assinatura do médico com fallback no perfil autenticado", () => {
    expect(
      resolveDoctorSignatureUrl(
        {
          id: "doctor-1",
          signatureUrl: null,
          doctorProfile: { signatureUrl: null },
        },
        {
          id: "doctor-1",
          doctorProfile: {
            signatureUrl: "https://storage.example.com/signatures/dr.png",
          },
        },
      ),
    ).toBe("https://storage.example.com/signatures/dr.png");
  });
});
