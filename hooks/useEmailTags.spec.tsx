import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEmailTags, normalizeEmailTag } from "./useEmailTags";
import { EmailTagsInput } from "@/components/surgery-request/EmailTagsInput";

function Campo({ onChange }: { onChange?: (tags: string[]) => void }) {
  const state = useEmailTags({ onChange });
  return (
    <>
      <EmailTagsInput id="para" state={state} aria-label="Para" />
      <output data-testid="tags">{state.tags.join("|")}</output>
    </>
  );
}

describe("useEmailTags + EmailTagsInput", () => {
  it("normaliza o separador final", () => {
    expect(normalizeEmailTag(" a@b.com; ")).toBe("a@b.com");
  });

  it("Enter, vírgula e ponto-e-vírgula viram tag; duplicata é ignorada", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Campo onChange={onChange} />);
    const campo = screen.getByLabelText("Para");

    await user.type(campo, "a@x.com{Enter}b@x.com,a@x.com;");

    expect(screen.getByTestId("tags")).toHaveTextContent("a@x.com|b@x.com");
    expect(onChange).toHaveBeenLastCalledWith(["a@x.com", "b@x.com"]);
  });

  it("Backspace no campo vazio remove a última e blur confirma o digitado", async () => {
    const user = userEvent.setup();
    render(<Campo />);
    const campo = screen.getByLabelText("Para");

    await user.type(campo, "a@x.com{Enter}b@x.com{Enter}{Backspace}");
    expect(screen.getByTestId("tags")).toHaveTextContent(/^a@x\.com$/);

    await user.type(campo, "c@x.com");
    await user.tab();
    expect(screen.getByTestId("tags")).toHaveTextContent("a@x.com|c@x.com");
  });

  it("remove pela tag", async () => {
    const user = userEvent.setup();
    render(<Campo />);
    await user.type(screen.getByLabelText("Para"), "a@x.com{Enter}");
    await user.click(screen.getByRole("button", { name: "Remover a@x.com" }));
    expect(screen.getByTestId("tags")).toBeEmptyDOMElement();
  });
});
