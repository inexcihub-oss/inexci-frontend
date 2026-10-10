import { describe, it, expect } from "vitest";
import { appointmentKeys, agendaExportKeys, registryKeys } from "./index";

describe("registryKeys", () => {
  it("mantém os valores que as telas já usavam (compatibilidade de cache)", () => {
    expect(registryKeys.hospitals()).toEqual(["hospitals"]);
    expect(registryKeys.healthPlans()).toEqual(["health-plans"]);
    expect(registryKeys.suppliers()).toEqual(["suppliers"]);
    expect(registryKeys.procedures()).toEqual(["procedures"]);
    expect(registryKeys.clinics()).toEqual(["clinics"]);
    expect(registryKeys.availableDoctors()).toEqual(["available-doctors"]);
  });

  it("detalhe e salas ficam sob o prefixo da lista (invalidação em cascata)", () => {
    expect(registryKeys.supplier("s1").slice(0, 1)).toEqual(
      registryKeys.suppliers(),
    );
    expect(registryKeys.manufacturer("m1").slice(0, 1)).toEqual(
      registryKeys.manufacturers(),
    );
    expect(registryKeys.clinicRooms("c1")).toEqual(["clinics", "c1", "rooms"]);
  });
});

describe("appointmentKeys", () => {
  it("tudo vive sob ['appointments']", () => {
    for (const key of [
      appointmentKeys.agenda("a", "b"),
      appointmentKeys.agendaExport("a", "b"),
      appointmentKeys.activities("x"),
      appointmentKeys.hub({
        from: "a",
        to: null,
        status: ["scheduled"],
        order: "asc",
        doctorIds: [],
      }),
    ]) {
      expect(key[0]).toBe(appointmentKeys.all[0]);
    }
  });

  it("hub e agenda mantêm o formato antigo", () => {
    expect(appointmentKeys.agenda("f", "t")).toEqual([
      "appointments",
      "agenda",
      "f",
      "t",
    ]);
    expect(
      appointmentKeys.hub({
        from: undefined,
        to: "t",
        status: ["a", "b"],
        order: "desc",
        doctorIds: ["d1", "d2"],
      }),
    ).toEqual(["appointments", "hub", null, "t", "a,b", "desc", "d1,d2"]);
    expect(appointmentKeys.activities("x")).toEqual([
      "appointments",
      "x",
      "activities",
    ]);
    expect(agendaExportKeys.surgeries("f", "t")).toEqual([
      "surgery-requests",
      "agenda-export",
      "f",
      "t",
    ]);
  });
});
