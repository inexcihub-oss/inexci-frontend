import { GENERIC_OPTION_NAME } from "@/lib/generic-option";
import {
  OpmeItemRef,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";

/**
 * Escolha do fornecedor vencedor — o que o convênio aprovou.
 *
 * Duas respostas são válidas: um dos fornecedores cotados no item, ou "Outro",
 * o fornecedor genérico da conta, que significa "aprovaram alguém fora da
 * lista". "Outro" não tem id conhecido pelo cliente (ele fica escondido do
 * catálogo), então viaja como marca no payload e o backend resolve pela conta.
 */
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

/**
 * Cotados com id, mais "Outro" ao final — sempre, mesmo que o item não o tenha
 * entre os cotados: é justamente o caso de o convênio aprovar quem não foi
 * cotado. Cotado sem id fica de fora porque escolhê-lo não teria o que gravar.
 */
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

/**
 * O que já está gravado; na falta, o primeiro cotado **real**.
 *
 * O genérico fica fora dessa preferência de propósito: ele é quem preenche os
 * slots de um rascunho incompleto, e pré-selecioná-lo faria todo rascunho
 * entrar no relatório como "Outro" sem ninguém ter escolhido — inflando
 * exatamente o número que o relatório existe para medir.
 */
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

/** Rótulo do resumo, na última etapa antes de confirmar. */
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
