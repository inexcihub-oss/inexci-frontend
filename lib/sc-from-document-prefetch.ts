import { procedureService, Procedure } from "@/services/procedure.service";
import { hospitalService } from "@/services/hospital.service";
import { healthPlanService } from "@/services/health-plan.service";
import { DocumentEntityCandidate } from "@/types/surgery-request.types";

export const SC_FROM_DOCUMENT_CATALOG_PREFETCH_KEY =
  "sc_from_document_catalog_prefetch";

export interface ScFromDocumentCatalogPrefetch {
  procedures: Procedure[];
  hospitals: DocumentEntityCandidate[];
  healthPlans: DocumentEntityCandidate[];
}

export async function prefetchScFromDocumentCatalogs(): Promise<void> {
  try {
    const [procedures, hospitals, healthPlans] = await Promise.all([
      procedureService.getAll(),
      hospitalService.getAll(),
      healthPlanService.getAll(),
    ]);

    const payload: ScFromDocumentCatalogPrefetch = {
      procedures,
      hospitals: hospitals.map((h) => ({ id: h.id, name: h.name })),
      healthPlans: healthPlans.map((h) => ({ id: h.id, name: h.name })),
    };

    sessionStorage.setItem(
      SC_FROM_DOCUMENT_CATALOG_PREFETCH_KEY,
      JSON.stringify(payload),
    );
  } catch {
    sessionStorage.removeItem(SC_FROM_DOCUMENT_CATALOG_PREFETCH_KEY);
  }
}

export function readScFromDocumentCatalogPrefetch():
  | ScFromDocumentCatalogPrefetch
  | null {
  const raw = sessionStorage.getItem(SC_FROM_DOCUMENT_CATALOG_PREFETCH_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ScFromDocumentCatalogPrefetch;
    sessionStorage.removeItem(SC_FROM_DOCUMENT_CATALOG_PREFETCH_KEY);
    return parsed;
  } catch {
    sessionStorage.removeItem(SC_FROM_DOCUMENT_CATALOG_PREFETCH_KEY);
    return null;
  }
}
