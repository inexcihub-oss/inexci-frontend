import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityContent } from "./ActivityContent";

describe("ActivityContent", () => {
  it("destaca a menção pelo nome do usuário", () => {
    render(
      <ActivityContent
        content="@Dr. Bruno confere o laudo?"
        mentions={[{ id: "user-2", name: "Dr. Bruno" }]}
      />,
    );

    const marcado = screen.getByText("@Dr. Bruno");
    expect(marcado).toHaveAttribute("data-mention-id", "user-2");
  });

  it("mantém o resto do texto intacto", () => {
    render(
      <ActivityContent
        content="@Dr. Bruno confere o laudo?"
        mentions={[{ id: "user-2", name: "Dr. Bruno" }]}
      />,
    );

    expect(screen.getByTestId("activity-content")).toHaveTextContent(
      "@Dr. Bruno confere o laudo?",
    );
  });

  it("renderiza texto puro quando não há menção", () => {
    render(<ActivityContent content="comentário simples" mentions={[]} />);

    expect(screen.getByTestId("activity-content")).toHaveTextContent(
      "comentário simples",
    );
    expect(document.querySelector("[data-mention-id]")).toBeNull();
  });

  it("não quebra com nome que contém caractere especial de regex", () => {
    render(
      <ActivityContent
        content="@Ana (assistente) pode ver?"
        mentions={[{ id: "user-9", name: "Ana (assistente)" }]}
      />,
    );

    expect(screen.getByText("@Ana (assistente)")).toHaveAttribute(
      "data-mention-id",
      "user-9",
    );
  });

  it("prefere o nome mais longo quando um é prefixo do outro", () => {
    render(
      <ActivityContent
        content="@Ana Paula e @Ana"
        mentions={[
          { id: "u1", name: "Ana" },
          { id: "u2", name: "Ana Paula" },
        ]}
      />,
    );

    expect(screen.getByText("@Ana Paula")).toHaveAttribute(
      "data-mention-id",
      "u2",
    );
  });
});
