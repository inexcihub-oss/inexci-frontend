"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { MoneyInput } from "@/components/finance/receivables/MoneyInput";
import { useFinanceProfessionals } from "@/hooks/useFinanceProfessionals";
import type { ReceivableItemInput } from "@/lib/schemas/finance";

interface ReceivableItemFieldsProps {
  value: ReceivableItemInput;
  onChange: (patch: Partial<ReceivableItemInput>) => void;
  errors: Partial<Record<keyof ReceivableItemInput, string>>;
}

export function ReceivableItemFields({
  value,
  onChange,
  errors,
}: ReceivableItemFieldsProps) {
  const { data: profissionais = [] } = useFinanceProfessionals();
  const opcoes = [
    { value: "", label: "Sem profissional" },
    ...profissionais.map((p) => ({ value: p.id, label: p.name })),
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <Input
          label="Descrição"
          placeholder="Ex.: Consulta particular"
          required
          value={value.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          error={errors.description}
        />
      </div>
      <Select
        label="Profissional executante"
        options={opcoes}
        value={value.executedById ?? ""}
        onChange={(e) => onChange({ executedById: e.target.value })}
        error={errors.executedById}
      />
      <MoneyInput
        label="Valor"
        required
        value={value.amount ?? ""}
        onChange={(amount) => onChange({ amount })}
        error={errors.amount}
      />
    </div>
  );
}

export function itemPayload(item: {
  description: string;
  executedById?: string;
  amount: string;
}) {
  return {
    description: item.description,
    unitAmount: item.amount,
    ...(item.executedById ? { executedById: item.executedById } : {}),
  };
}

export const ITEM_VAZIO: ReceivableItemInput = {
  description: "",
  executedById: "",
  amount: "",
};
