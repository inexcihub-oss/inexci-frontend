import { render, screen } from "@testing-library/react";
import { AdminUnderConstruction } from "@/components/admin/AdminUnderConstruction";

describe("AdminUnderConstruction", () => {
  it("mostra o título e o aviso Em construção", () => {
    render(<AdminUnderConstruction title="Envios" />);

    expect(screen.getByRole("heading", { name: "Envios" })).toBeInTheDocument();
    expect(screen.getByText("Em construção")).toBeInTheDocument();
  });
});
