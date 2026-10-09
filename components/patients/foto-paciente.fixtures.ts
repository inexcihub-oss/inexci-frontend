const ASSINATURAS: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
  "image/jpg": [0xff, 0xd8, 0xff, 0xe0],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
};

export function arquivoDeImagem(nome: string, tipo: string, bytes = 16): File {
  const dados = new Uint8Array(bytes);
  const assinatura = ASSINATURAS[tipo] ?? [];
  dados.set(assinatura.slice(0, bytes));
  return new File([dados], nome, { type: tipo });
}
