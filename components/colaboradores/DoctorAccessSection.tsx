"use client";

import { useState, useEffect, useCallback } from "react";
import { FormSection } from "@/components/details";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { userDoctorAccessService } from "@/services/user-doctor-access.service";
import { availableDoctorsService } from "@/services/available-doctors.service";
import { AvailableDoctor, UserDoctorAccess } from "@/types";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { Check, Stethoscope } from "lucide-react";

interface DoctorAccessSectionProps {
  collaboratorId: string;
}

export function DoctorAccessSection({
  collaboratorId,
}: DoctorAccessSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountDoctors, setAccountDoctors] = useState<AvailableDoctor[]>([]);
  const [_currentAccess, setCurrentAccess] = useState<UserDoctorAccess[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<Set<string>>(
    new Set(),
  );
  const [originalSelectedIds, setOriginalSelectedIds] = useState<Set<string>>(
    new Set(),
  );
  const { toast, showToast, hideToast } = useToast();

  const isDirty =
    selectedDoctorIds.size !== originalSelectedIds.size ||
    [...selectedDoctorIds].some((id) => !originalSelectedIds.has(id));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [doctors, access] = await Promise.all([
        availableDoctorsService.getDoctorsForAccount(),
        userDoctorAccessService.getAccessForUser(collaboratorId),
      ]);

      setAccountDoctors(doctors);
      setCurrentAccess(access);

      const activeIds = new Set(
        access
          .filter((a) => a.status === "active")
          .map((a) => a.doctor_user_id),
      );
      setSelectedDoctorIds(activeIds);
      setOriginalSelectedIds(new Set(activeIds));
    } catch (error) {
      console.error("Erro ao carregar dados de acesso:", error);
      showToast("Erro ao carregar dados de acesso a médicos.", "error");
    } finally {
      setLoading(false);
    }
  }, [collaboratorId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleDoctor = (doctorId: string) => {
    setSelectedDoctorIds((prev) => {
      const next = new Set(prev);
      if (next.has(doctorId)) {
        next.delete(doctorId);
      } else {
        next.add(doctorId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userDoctorAccessService.setAccessForUser(collaboratorId, [
        ...selectedDoctorIds,
      ]);
      setOriginalSelectedIds(new Set(selectedDoctorIds));
      showToast("Acessos atualizados com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar acessos:", error);
      showToast("Erro ao salvar acessos.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FormSection title="Acesso a Médicos">
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      </FormSection>
    );
  }

  if (accountDoctors.length === 0) {
    return (
      <FormSection title="Acesso a Médicos">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Stethoscope className="w-10 h-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">
            Nenhum médico cadastrado na conta.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Cadastre médicos para gerenciar acessos.
          </p>
        </div>
      </FormSection>
    );
  }

  return (
    <>
      <FormSection title="Acesso a Médicos">
        <p className="text-sm text-gray-500 mb-4">
          Selecione os médicos cujas solicitações este colaborador poderá
          visualizar e gerenciar.
        </p>

        <div className="space-y-2">
          {accountDoctors.map((doctor) => {
            const isSelected = selectedDoctorIds.has(doctor.id);
            return (
              <button
                key={doctor.id}
                type="button"
                onClick={() => toggleDoctor(doctor.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left min-h-[56px] active:scale-[0.99] ${
                  isSelected
                    ? "border-primary-300 bg-primary-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold ${
                      isSelected
                        ? "bg-primary-200 text-primary-800"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {doctor.name
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {doctor.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doctor.crm
                        ? `CRM ${doctor.crm}/${doctor.crm_state}`
                        : ""}
                      {doctor.specialty
                        ? `${doctor.crm ? " · " : ""}${doctor.specialty}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-primary-600 border-primary-600"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Botão salvar acessos */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} isLoading={saving} disabled={!isDirty}>
            Salvar acessos
          </Button>
        </div>
      </FormSection>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as ToastType}
          onClose={hideToast}
        />
      )}
    </>
  );
}
