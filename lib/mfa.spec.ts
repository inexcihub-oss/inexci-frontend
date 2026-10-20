import { describe, it, expect, vi } from "vitest";
import { buildRecoveryCodesFile, downloadTextFile } from "./mfa";
import {
  mfaDisableSchema,
  mfaRecoveryCodeSchema,
  mfaTotpCodeSchema,
} from "./schemas/auth.schema";

describe("buildRecoveryCodesFile", () => {
  it("lista os códigos, a conta e o aviso de uso único", () => {
    const conteudo = buildRecoveryCodesFile(
      ["AAAAA-BBBBB", "CCCCC-DDDDD"],
      "dr@inexci.com",
      new Date("2026-10-10T12:00:00Z"),
    );
    expect(conteudo).toContain("Conta: dr@inexci.com");
    expect(conteudo).toContain("AAAAA-BBBBB\nCCCCC-DDDDD");
    expect(conteudo).toContain("uma única vez");
  });

  it("omite a linha da conta sem e-mail", () => {
    expect(buildRecoveryCodesFile(["A"], null)).not.toContain("Conta:");
  });
});

describe("downloadTextFile", () => {
  it("cria um link de download e libera a URL", () => {
    const createObjectURL = vi.fn(() => "blob:x");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadTextFile("codigos.txt", "conteudo");

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:x");
    click.mockRestore();
  });
});

describe("schemas de MFA", () => {
  it("TOTP exige 6 dígitos", () => {
    expect(mfaTotpCodeSchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(mfaTotpCodeSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(mfaTotpCodeSchema.safeParse({ code: "12345a" }).success).toBe(
      false,
    );
  });

  it("código de recuperação aceita com ou sem hífen", () => {
    expect(
      mfaRecoveryCodeSchema.safeParse({ code: "abcde-fgh23" }).success,
    ).toBe(true);
    expect(mfaRecoveryCodeSchema.safeParse({ code: "ABCDEFGH23" }).success).toBe(
      true,
    );
    expect(mfaRecoveryCodeSchema.safeParse({ code: "123456" }).success).toBe(
      false,
    );
  });

  it("desativar exige senha e aceita TOTP ou código de recuperação", () => {
    expect(
      mfaDisableSchema.safeParse({ password: "x", code: "123456" }).success,
    ).toBe(true);
    expect(
      mfaDisableSchema.safeParse({ password: "x", code: "ABCDE-FGH23" })
        .success,
    ).toBe(true);
    expect(
      mfaDisableSchema.safeParse({ password: "", code: "123456" }).success,
    ).toBe(false);
    expect(
      mfaDisableSchema.safeParse({ password: "x", code: "abc" }).success,
    ).toBe(false);
  });
});
