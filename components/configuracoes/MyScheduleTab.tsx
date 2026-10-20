"use client";

import { ScheduleWeekEditor } from "@/components/availability/ScheduleWeekEditor";

export function MyScheduleTab({ doctorId }: { doctorId: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 md:p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Minha agenda</h2>
        <p className="text-sm text-gray-500 mt-1">
          Dias e horários em que você atende. A recepção vê esses horários ao
          agendar e é avisada quando marca fora deles.
        </p>
      </div>
      <ScheduleWeekEditor doctorId={doctorId} />
    </div>
  );
}
