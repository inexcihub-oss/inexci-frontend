"use client";

import { useState } from "react";
import { Combobox } from "@/components/ui/Combobox";
import { CreateHealthPlanModal } from "@/components/surgery-request/CreateHealthPlanModal";
import { HealthPlan } from "@/services/health-plan.service";

interface HealthPlanComboboxFieldProps {
  label?: string;
  healthPlans: HealthPlan[];
  value: string;
  onChange: (healthPlanId: string) => void;
  onHealthPlanCreated: (healthPlan: HealthPlan) => void;
  placeholder?: string;
  className?: string;
  /**
   * Falso quando o usuário não pode cadastrar convênios (sem `administracao`):
   * a opção "Cadastrar novo" some do combobox e uma dica aparece no lugar,
   * em vez de deixar a criação disponível e devolver 403 ao confirmar.
   */
  canCreate?: boolean;
}

export function HealthPlanComboboxField({
  label = "Convênio",
  healthPlans,
  value,
  onChange,
  onHealthPlanCreated,
  placeholder = "Selecione um convênio",
  className,
  canCreate = true,
}: HealthPlanComboboxFieldProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");

  return (
    <>
      <Combobox
        label={label}
        className={className}
        options={healthPlans.map((plan) => ({
          value: plan.id,
          label: plan.name,
        }))}
        value={value}
        onValueChange={onChange}
        placeholder={placeholder}
        searchPlaceholder="Buscar convênio..."
        emptyText="Nenhum convênio encontrado."
        createNewLabel="convênio"
        onCreateNew={
          canCreate
            ? (query) => {
                setPrefillName(query);
                setCreateOpen(true);
              }
            : undefined
        }
      />
      {!canCreate && (
        <p className="mt-1 text-xs text-gray-400">
          Não encontrou o convênio? Peça a um administrador da conta para
          cadastrá-lo.
        </p>
      )}

      <CreateHealthPlanModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        initialName={prefillName}
        onSuccess={(healthPlan) => {
          onHealthPlanCreated(healthPlan);
          onChange(healthPlan.id);
          setCreateOpen(false);
        }}
      />
    </>
  );
}
