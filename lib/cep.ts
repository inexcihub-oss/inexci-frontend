/**
 * Lookup de CEP via ViaCEP (https://viacep.com.br/).
 * Não exige autenticação. Resposta JSON pública.
 *
 * Mantém um cache em memória para evitar requisições duplicadas durante a sessão.
 */
import { unmask } from "./masks";

export interface CepLookupResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface ViaCepRawResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

const CACHE = new Map<string, CepLookupResult>();
const VIACEP_BASE = "https://viacep.com.br/ws";

export class CepLookupError extends Error {
  constructor(
    message: string,
    public readonly code: "invalid" | "not_found" | "network",
  ) {
    super(message);
    this.name = "CepLookupError";
  }
}

export function isCompleteCep(value: string | undefined | null): boolean {
  return unmask(value).length === 8;
}

/**
 * Busca o endereço de um CEP. Aceita string com ou sem máscara.
 * Lança {@link CepLookupError} em caso de CEP inválido, não encontrado ou erro de rede.
 */
export async function lookupCep(
  rawCep: string,
  signal?: AbortSignal,
): Promise<CepLookupResult> {
  const digits = unmask(rawCep);
  if (digits.length !== 8) {
    throw new CepLookupError("CEP deve conter 8 dígitos.", "invalid");
  }

  const cached = CACHE.get(digits);
  if (cached) return cached;

  let response: Response;
  try {
    response = await fetch(`${VIACEP_BASE}/${digits}/json/`, { signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new CepLookupError(
      "Não foi possível consultar o CEP. Verifique sua conexão.",
      "network",
    );
  }

  if (!response.ok) {
    throw new CepLookupError(
      "Não foi possível consultar o CEP. Tente novamente.",
      "network",
    );
  }

  const data: ViaCepRawResponse = await response.json();
  if (data.erro) {
    throw new CepLookupError("CEP não encontrado.", "not_found");
  }

  const result: CepLookupResult = {
    cep: digits,
    logradouro: data.logradouro?.trim() ?? "",
    complemento: data.complemento?.trim() ?? "",
    bairro: data.bairro?.trim() ?? "",
    cidade: data.localidade?.trim() ?? "",
    uf: (data.uf ?? "").trim().toUpperCase(),
  };
  CACHE.set(digits, result);
  return result;
}

/**
 * Limpa o cache em memória. Útil para testes.
 */
export function _clearCepCache(): void {
  CACHE.clear();
}
