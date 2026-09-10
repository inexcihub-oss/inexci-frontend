import { describe, it, expect } from "vitest";
import {
  CSV_SEPARATOR,
  pdfText,
  sanitizeCsvValue,
  truncatePdfText,
} from "./export-format";

describe("CSV_SEPARATOR", () => {
  it("é ponto e vírgula, o separador de lista do pt-BR", () => {
    expect(CSV_SEPARATOR).toBe(";");
  });
});

describe("sanitizeCsvValue", () => {
  it("deixa passar o texto comum", () => {
    expect(sanitizeCsvValue("Ana Souza")).toBe("Ana Souza");
  });

  it("não precisa de aspas para vírgula, que não é mais o separador", () => {
    expect(sanitizeCsvValue("Artroscopia, joelho")).toBe("Artroscopia, joelho");
  });

  it("protege o dado que contém o próprio separador", () => {
    expect(sanitizeCsvValue("Artroscopia; joelho")).toBe(
      '"Artroscopia; joelho"',
    );
  });

  it("dobra as aspas internas", () => {
    expect(sanitizeCsvValue('Diz "oi"; sai')).toBe('"Diz ""oi""; sai"');
  });

  it("neutraliza o que a planilha leria como fórmula", () => {
    // Tem aspas no meio, então sai prefixado *e* entre aspas.
    expect(sanitizeCsvValue('=HYPERLINK("http://x")')).toBe(
      '"\'=HYPERLINK(""http://x"")"',
    );
    expect(sanitizeCsvValue("=SOMA(A1:A2)")).toBe("'=SOMA(A1:A2)");
    expect(sanitizeCsvValue("+1+1")).toBe("\'+1+1");
    expect(sanitizeCsvValue("-1+1")).toBe("\'-1+1");
    expect(sanitizeCsvValue("@SUM(A1:A2)")).toBe("\'@SUM(A1:A2)");
  });
});

describe("pdfText", () => {
  it("mantém os acentos, que o WinAnsi codifica", () => {
    expect(pdfText("Convênio São João")).toBe("Convênio São João");
  });

  it("troca travessão por hífen", () => {
    expect(pdfText("Hospital \u2014 Centro")).toBe("Hospital - Centro");
  });

  it("descarta o que está fora do Latin-1", () => {
    expect(pdfText("Prioridade \u2191 alta")).toBe("Prioridade  alta");
  });

  /**
   * U+0080-U+009F sao controles C1: caem dentro de Latin-1, mas o WinAnsi nao
   * os codifica e o pdf-lib lanca ao desenhar. Chegam por colagem de texto de
   * fora e derrubariam a geracao inteira do relatorio.
   */
  it("descarta os controles C1, que o Latin-1 aceita e o WinAnsi nao", () => {
    expect(pdfText("Ana\u0085Souza")).toBe("AnaSouza");
    expect(pdfText("Ana\u009fSouza")).toBe("AnaSouza");
  });
});

describe("truncatePdfText", () => {
  // Fonte de mentira: 10pt de largura por caractere, em qualquer tamanho.
  const font = { widthOfTextAtSize: (texto: string) => texto.length * 10 };

  it("devolve inteiro o que já cabe", () => {
    expect(truncatePdfText("Ana", 100, font, 7)).toBe("Ana");
  });

  it("encurta com reticências o que não cabe", () => {
    expect(truncatePdfText("Ana Souza Lima", 80, font, 7)).toBe("Ana S...");
  });

  it("devolve vazio quando nem as reticências cabem", () => {
    expect(truncatePdfText("Ana Souza", 10, font, 7)).toBe("");
  });
});
