import { GENERIC_OPTION_NAME } from "@/lib/generic-option";
import {
  OpmeItemRef,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";

export const GENERIC_SUPPLIER_VALUE = "__generico__";

export interface SupplierSelectOption {
  value: string;
  label: string;
}

interface SupplierRef {
  id?: string | number;
  name?: string;
  isGeneric?: boolean;
}

function cotados(opme?: OpmeItemRef | null): SupplierRef[] {
  return (opme?.suppliers ?? []) as SupplierRef[];
}

function ehGenerico(supplier: SupplierRef): boolean {
  return supplier.isGeneric === true;
}

export function buildSupplierOptions(
  opme?: OpmeItemRef | null,
): SupplierSelectOption[] {
  const opcoes = cotados(opme)
    .filter((supplier) => !ehGenerico(supplier) && supplier.id != null)
    .map((supplier) => ({
      value: String(supplier.id),
      label: supplier.name?.trim() || "Fornecedor sem nome",
    }));

  return [
    ...opcoes,
    { value: GENERIC_SUPPLIER_VALUE, label: GENERIC_OPTION_NAME },
  ];
}

export function buildInitialSelectedOpmeSuppliers(
  solicitacao: SurgeryRequestDetail,
): Record<string, string> {
  const inicial: Record<string, string> = {};

  (solicitacao?.opmeItems ?? []).forEach((item) => {
    const selecionado = item.selectedSupplier as SupplierRef | undefined | null;

    if (selecionado && ehGenerico(selecionado)) {
      inicial[String(item.id)] = GENERIC_SUPPLIER_VALUE;
      return;
    }

    const idGravado = selecionado?.id ?? item.selectedSupplierId;
    if (idGravado) {
      inicial[String(item.id)] = String(idGravado);
      return;
    }

    const primeiroReal = cotados(item).find(
      (supplier) => !ehGenerico(supplier) && supplier.id != null,
    );
    if (primeiroReal) {
      inicial[String(item.id)] = String(primeiroReal.id);
    }
  });

  return inicial;
}

export function buildSupplierAuthorizationPayload(value?: string): {
  selectedSupplierId?: string;
  selectedSupplierIsGeneric?: boolean;
} {
  if (!value) return {};
  if (value === GENERIC_SUPPLIER_VALUE) {
    return { selectedSupplierIsGeneric: true };
  }
  return { selectedSupplierId: value };
}

export function describeSelectedSupplier(
  opme: OpmeItemRef | null | undefined,
  value?: string,
): string {
  if (value === GENERIC_SUPPLIER_VALUE) return GENERIC_OPTION_NAME;

  const escolhido = cotados(opme).find(
    (supplier) => supplier.id != null && String(supplier.id) === value,
  );
  return escolhido?.name?.trim() || "Não selecionado";
}
