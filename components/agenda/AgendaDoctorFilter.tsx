"use client";

import { AvailableDoctor } from "@/types";
import { cn } from "@/lib/utils";

interface AgendaDoctorFilterProps {
  doctors: AvailableDoctor[];
  selectedDoctorIds: string[];
  onChange: (doctorIds: string[]) => void;
  /** Contagem por médico no período visível (opcional) */
  countByDoctorId?: Record<string, number>;
}

export function AgendaDoctorFilter({
  doctors,
  selectedDoctorIds,
  onChange,
  countByDoctorId,
}: AgendaDoctorFilterProps) {
  if (doctors.length <= 1) return null;

  const showAll = selectedDoctorIds.length === 0;

  const toggleDoctor = (doctorId: string) => {
    if (selectedDoctorIds.length === 0) {
      onChange([doctorId]);
      return;
    }

    if (selectedDoctorIds.includes(doctorId)) {
      onChange(selectedDoctorIds.filter((id) => id !== doctorId));
      return;
    }

    onChange([...selectedDoctorIds, doctorId]);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-neutral-500 shrink-0">
        Médicos:
      </span>
      <button
        type="button"
        onClick={() => onChange([])}
        className={cn(
          "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
          showAll
            ? "bg-neutral-900 text-white"
            : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50",
        )}
      >
        Todos
      </button>
      {doctors.map((doctor) => {
        const isActive =
          !showAll && selectedDoctorIds.includes(doctor.id);
        const count = countByDoctorId?.[doctor.id];

        return (
          <button
            key={doctor.id}
            type="button"
            onClick={() => toggleDoctor(doctor.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all max-w-[200px] truncate",
              isActive
                ? "bg-teal-600 text-white"
                : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50",
            )}
            title={doctor.name}
          >
            {doctor.name}
            {typeof count === "number" && (
              <span className="ml-1.5 opacity-80">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
