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
}

export function HealthPlanComboboxField({
  label = "Convênio",
  healthPlans,
  value,
  onChange,
  onHealthPlanCreated,
  placeholder = "Selecione um convênio",
  className,
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
        onCreateNew={(query) => {
          setPrefillName(query);
          setCreateOpen(true);
        }}
      />

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
