import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * TASK-FE-Q04 — Testes para validar que dados mock de horários
 * foram removidos da página de detalhe do médico.
 *
 * Valida que:
 * - Não há horários hardcoded (Segunda/Quarta/Sexta, 08:00-18:00)
 * - Não há locais fictícios (Hospital A, Hospital B, Clínica A)
 * - A seção foi substituída por aviso "Em breve"
 */

const filePath = path.resolve(__dirname, "../../medico/[id]/page.tsx");
const fileContent = fs.readFileSync(filePath, "utf-8");

describe("Médico Detalhe — Dados mock de horários (Q04)", () => {
  describe("Remoção de horários hardcoded", () => {
    it("não deve conter dias da semana hardcoded como dados", () => {
      // Esses eram os dias mock na tabela de horários
      expect(fileContent).not.toContain("Segunda-feira");
      expect(fileContent).not.toContain("Quarta-feira");
      expect(fileContent).not.toContain("Sexta-feira");
    });

    it("não deve conter horários hardcoded", () => {
      expect(fileContent).not.toContain("08:00 - 18:00");
      expect(fileContent).not.toContain("08:00 - 15:00");
    });

    it("não deve conter locais fictícios", () => {
      expect(fileContent).not.toContain("Hospital A");
      expect(fileContent).not.toContain("Hospital B");
      expect(fileContent).not.toContain("Clínica A");
    });

    it("não deve conter tabela de horários com headers antigos", () => {
      // A tabela tinha <th>Dia da semana</th><th>Horário</th><th>Local</th>
      expect(fileContent).not.toContain("Dia da semana");
    });
  });

  describe("Substituição por aviso 'Em breve'", () => {
    it("deve manter a seção Consultório/Ambulatório", () => {
      expect(fileContent).toContain("Consultório/Ambulatório");
    });

    it("deve exibir mensagem 'Em breve'", () => {
      expect(fileContent).toContain("Em breve");
    });

    it("deve ter texto explicativo sobre a funcionalidade futura", () => {
      expect(fileContent).toContain(
        "gerenciamento de horários e locais de atendimento",
      );
    });

    it("deve usar o ícone Clock do lucide-react", () => {
      expect(fileContent).toContain("<Clock");
      // Confirma import do Clock
      expect(fileContent).toMatch(/import.*Clock.*from.*lucide-react/);
    });
  });
});
