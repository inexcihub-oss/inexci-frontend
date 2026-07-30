"use client";

/** Timeline de consultas e cirurgias do paciente. Implementada na Task 7. */
export function PatientHistoryTab({
  patientId,
  currentAppointmentId,
}: {
  patientId: string;
  currentAppointmentId: string;
}) {
  void patientId;
  void currentAppointmentId;
  return (
    <p className="text-sm text-gray-400 py-4">
      Consultas e cirurgias anteriores
    </p>
  );
}
