import { describe, it, expect } from "vitest";
import {
  idadeEmAnos,
  montarHistorico,
  resumoDaFicha,
  situacaoConsulta,
  ultimaVisita,
} from "@/lib/patient-history";
import { Appointment } from "@/services/appointment.service";
import { ClinicalRecord } from "@/services/clinical-record.service";
import { SurgeryRequestListItem } from "@/services/surgery-request.service";

const AGORA = new Date("2026-10-07T15:00:00.000Z");

const consulta = (over: Partial<Appointment>): Appointment => ({
  id: "a",
  doctorId: "d-1",
  patientId: "p-1",
  type: "follow_up",
  status: "scheduled",
  scheduledAt: "2026-09-18T13:00:00.000Z",
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
  clinicId: null,
  ...over,
});

const ficha = (over: Partial<ClinicalRecord>): ClinicalRecord => ({
  id: "r",
  doctorId: "d-1",
  patientId: "p-1",
  appointmentId: null,
  anamnesis: null,
  physicalExam: null,
  diagnosis: null,
  cidCodes: null,
  conduct: null,
  surgicalIndication: false,
  surgeryRequestId: null,
  procedureId: null,
  procedure: null,
  finalizedAt: "2026-09-18T14:00:00.000Z",
  createdAt: "2026-09-18T14:36:00.000Z",
  updatedAt: "2026-09-18T14:36:00.000Z",
  ...over,
});

describe("montarHistorico", () => {
  it("junta a ficha sem vínculo à consulta do mesmo profissional no mesmo dia", () => {
    const { itens } = montarHistorico({
      appointments: [consulta({ id: "a-1", status: "waiting" })],
      records: [ficha({ id: "r-1" })],
      surgeries: [],
      agora: AGORA,
    });

    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({
      kind: "consulta",
      appointment: { id: "a-1" },
      record: { id: "r-1" },
    });
  });

  it("não junta com consulta de outro profissional nem de outro dia", () => {
    const { itens } = montarHistorico({
      appointments: [
        consulta({ id: "a-outro", doctorId: "d-2" }),
        consulta({ id: "a-ontem", scheduledAt: "2026-09-17T13:00:00.000Z" }),
      ],
      records: [ficha({ id: "r-1" })],
      surgeries: [],
      agora: AGORA,
    });

    expect(itens.map((i) => i.kind).sort()).toEqual([
      "consulta",
      "consulta",
      "ficha",
    ]);
  });

  it("não junta com consulta cancelada", () => {
    const { itens } = montarHistorico({
      appointments: [consulta({ id: "a-1", status: "cancelled" })],
      records: [ficha({ id: "r-1" })],
      surgeries: [],
      agora: AGORA,
    });

    expect(itens.find((i) => i.kind === "ficha")).toBeDefined();
  });

  it("respeita o vínculo explícito antes de casar por dia", () => {
    const { itens } = montarHistorico({
      appointments: [
        consulta({ id: "a-1", scheduledAt: "2026-09-18T12:00:00.000Z" }),
        consulta({ id: "a-2", scheduledAt: "2026-09-18T14:30:00.000Z" }),
      ],
      records: [
        ficha({ id: "r-ligada", appointmentId: "a-2" }),
        ficha({ id: "r-solta" }),
      ],
      surgeries: [],
      agora: AGORA,
    });

    const porConsulta = Object.fromEntries(
      itens
        .filter((i) => i.kind === "consulta")
        .map((i) => [
          i.kind === "consulta" && i.appointment.id,
          i.kind === "consulta" && i.record?.id,
        ]),
    );
    expect(porConsulta).toEqual({ "a-1": "r-solta", "a-2": "r-ligada" });
  });

  it("ficha vinculada a consulta que não veio na lista aparece sozinha, sem casar por dia", () => {
    const { itens } = montarHistorico({
      appointments: [consulta({ id: "a-1", status: "completed" })],
      records: [ficha({ id: "r-1", appointmentId: "a-sumida" })],
      surgeries: [],
      agora: AGORA,
    });

    expect(itens).toHaveLength(2);
    expect(itens).toContainEqual(
      expect.objectContaining({
        kind: "consulta",
        appointment: expect.objectContaining({ id: "a-1" }),
        record: null,
      }),
    );
    expect(itens).toContainEqual(
      expect.objectContaining({ kind: "ficha", id: "ficha-r-1" }),
    );
  });

  it("separa as próximas consultas em aberto, da mais próxima à mais distante", () => {
    const { proximas, itens } = montarHistorico({
      appointments: [
        consulta({ id: "futura-2", scheduledAt: "2026-11-06T13:00:00.000Z" }),
        consulta({ id: "hoje", scheduledAt: "2026-10-07T20:00:00.000Z" }),
        consulta({
          id: "futura-cancelada",
          status: "cancelled",
          scheduledAt: "2026-10-20T13:00:00.000Z",
        }),
        consulta({ id: "passada" }),
      ],
      records: [],
      surgeries: [],
      agora: AGORA,
    });

    expect(proximas.map((a) => a.id)).toEqual(["hoje", "futura-2"]);
    expect(itens.map((i) => i.id)).toEqual([
      "consulta-futura-cancelada",
      "consulta-passada",
    ]);
  });

  it("ordena consultas, fichas e cirurgias do mais recente ao mais antigo", () => {
    const { itens } = montarHistorico({
      appointments: [consulta({ id: "a-1", status: "completed" })],
      records: [
        ficha({
          id: "r-avulsa",
          doctorId: "d-9",
          createdAt: "2026-08-01T12:00:00.000Z",
        }),
      ],
      surgeries: [
        {
          id: "sc-1",
          status: 6,
          surgeryDate: "2026-09-01T12:00:00.000Z",
          createdAt: "2026-08-20T12:00:00.000Z",
        } as unknown as SurgeryRequestListItem,
      ],
      agora: AGORA,
    });

    expect(itens.map((i) => i.id)).toEqual([
      "consulta-a-1",
      "cirurgia-sc-1",
      "ficha-r-avulsa",
    ]);
  });

  it("deixa de fora a consulta em curso e a ficha dela", () => {
    const { itens, proximas } = montarHistorico({
      appointments: [
        consulta({
          id: "atual",
          status: "in_progress",
          scheduledAt: "2026-10-07T14:00:00.000Z",
        }),
      ],
      records: [
        ficha({
          id: "r-atual",
          appointmentId: "atual",
          createdAt: "2026-10-07T14:05:00.000Z",
        }),
      ],
      surgeries: [],
      agora: AGORA,
      excluirConsultaId: "atual",
    });

    expect(itens).toEqual([]);
    expect(proximas).toEqual([]);
  });
});

describe("situacaoConsulta", () => {
  it("consulta passada esquecida em aberto vira 'Sem registro' sem ficha", () => {
    for (const status of [
      "scheduled",
      "confirmed",
      "waiting",
      "in_progress",
    ] as const) {
      expect(
        situacaoConsulta(
          { status, scheduledAt: "2026-09-18T13:00:00.000Z" },
          false,
          AGORA,
        ),
      ).toEqual({ label: "Sem registro", tom: "cinza" });
    }
  });

  it("consulta passada em aberto com ficha conta como realizada", () => {
    expect(
      situacaoConsulta(
        { status: "waiting", scheduledAt: "2026-09-18T13:00:00.000Z" },
        true,
        AGORA,
      ),
    ).toEqual({ label: "Realizada", tom: "verde" });
  });

  it("consulta de hoje mantém o status real", () => {
    expect(
      situacaoConsulta(
        { status: "waiting", scheduledAt: "2026-10-07T12:00:00.000Z" },
        false,
        AGORA,
      ).label,
    ).toBe("Aguardando");
  });

  it("status fechados não mudam", () => {
    expect(
      situacaoConsulta(
        { status: "no_show", scheduledAt: "2026-09-18T13:00:00.000Z" },
        false,
        AGORA,
      ).label,
    ).toBe("Faltou");
  });
});

describe("resumoDaFicha", () => {
  it("prefere diagnóstico, depois conduta, depois anamnese, sem HTML", () => {
    expect(
      resumoDaFicha(
        ficha({
          anamnesis: "<p>PLANO OSSO FORTE</p>",
          conduct: "<p>Pilates&nbsp;2x</p>",
        }),
      ),
    ).toBe("Pilates 2x");
    expect(
      resumoDaFicha(ficha({ anamnesis: "<p>Dor &amp; cansaço</p>" })),
    ).toBe("Dor & cansaço");
    expect(resumoDaFicha(ficha({}))).toBe("");
  });
});

describe("idadeEmAnos", () => {
  it("conta anos completos no fuso da clínica", () => {
    expect(idadeEmAnos("1970-10-07", AGORA)).toBe(56);
    expect(idadeEmAnos("1970-10-08", AGORA)).toBe(55);
    expect(idadeEmAnos("1970-10-08T00:00:00.000Z", AGORA)).toBe(55);
    expect(idadeEmAnos(undefined, AGORA)).toBeNull();
    expect(idadeEmAnos("lixo", AGORA)).toBeNull();
  });
});

describe("ultimaVisita", () => {
  it("ignora consulta sem registro e pega a última que aconteceu", () => {
    const historico = montarHistorico({
      appointments: [
        consulta({ id: "esquecida", scheduledAt: "2026-10-01T13:00:00.000Z" }),
        consulta({ id: "feita", status: "completed" }),
      ],
      records: [],
      surgeries: [],
      agora: AGORA,
    });

    expect(ultimaVisita(historico)).toBe(
      new Date("2026-09-18T13:00:00.000Z").getTime(),
    );
  });
});
