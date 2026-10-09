import api from "@/lib/api";
import { logger } from "@/lib/logger";

interface RequisitoApi {
  status: number;
  label: string;
  pendencies: Array<{ key: string; label: string; blocking: boolean }>;
}

const STATUS_PENDENTE = 1;

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
