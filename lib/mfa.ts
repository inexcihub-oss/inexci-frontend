export const RECOVERY_CODES_FILENAME = "inexci-codigos-de-recuperacao.txt";

export function buildRecoveryCodesFile(
  codes: string[],
  email?: string | null,
  geradoEm: Date = new Date(),
): string {
  const linhas = [
    "Inexci - Códigos de recuperação da verificação em duas etapas",
    email ? `Conta: ${email}` : null,
    `Gerados em: ${geradoEm.toLocaleString("pt-BR")}`,
    "",
    "Cada código pode ser usado uma única vez, caso você perca o acesso ao aplicativo autenticador.",
    "Guarde este arquivo em um local seguro.",
    "",
    ...codes,
    "",
  ];
  return linhas.filter((linha): linha is string => linha !== null).join("\n");
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
