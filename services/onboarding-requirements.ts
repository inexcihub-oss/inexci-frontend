import api from "@/lib/api";
import { logger } from "@/lib/logger";

interface RequisitoApi {
  status: number;
  label: string;
  pendencies: Array<{ key: string; label: string; blocking: boolean }>;
}

/** `SurgeryRequestStatus.PENDING` — o enum do backend começa em 1. */
const STATUS_PENDENTE = 1;

/**
 * Rótulos dos requisitos que travam Pendente→Enviada, lidos do
 * `pendencies.config.ts` do backend.
 *
 * A alternativa era repetir os cinco rótulos na copy — e no dia em que uma
 * pendência mudasse lá, o tour passaria a ensinar algo errado sem ninguém
 * perceber.
 */
export async function fetchRequisitosPendente(): Promise<string[]> {
  try {
    const { data } = await api.get<RequisitoApi[]>(
      "/surgery-requests/pendencies/requirements",
    );
    const pendente = data.find((r) => r.status === STATUS_PENDENTE);
    return (pendente?.pendencies ?? [])
      .filter((p) => p.blocking)
      .map((p) => p.label);
  } catch (erro) {
    logger.error("Falha ao carregar requisitos do onboarding:", erro);
    return [];
  }
}
