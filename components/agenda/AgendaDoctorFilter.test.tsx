import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgendaDoctorFilter } from "@/components/agenda/AgendaDoctorFilter";

const doctors = [
  { id: "d1", name: "Dr. Carlos Mendonça", crm: "1", crmState: "SP" },
  { id: "d2", name: "Dra. Ana Paula", crm: "2", crmState: "RJ" },
];

describe("AgendaDoctorFilter", () => {
  it("não renderiza com apenas um médico", () => {
    const { container } = render(
      <AgendaDoctorFilter
        doctors={[doctors[0]]}
        selectedDoctorIds={[]}
        onChange={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("alterna seleção de médicos", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(
      <AgendaDoctorFilter
        doctors={doctors}
        selectedDoctorIds={[]}
        onChange={onChange}
        countByDoctorId={{ d1: 2, d2: 1 }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Dr. Carlos Mendonça/i }));
    expect(onChange).toHaveBeenCalledWith(["d1"]);

    rerender(
      <AgendaDoctorFilter
        doctors={doctors}
        selectedDoctorIds={["d1"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Dra. Ana Paula/i }));
    expect(onChange).toHaveBeenCalledWith(["d1", "d2"]);
  });

  it("limpa seleção ao clicar em Todos", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AgendaDoctorFilter
        doctors={doctors}
        selectedDoctorIds={["d1"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Todos$/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
