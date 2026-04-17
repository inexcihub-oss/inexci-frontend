"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { FormSection } from "@/components/details";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui";
import { userDoctorAccessService } from "@/services/user-doctor-access.service";
import { availableDoctorsService } from "@/services/available-doctors.service";
import { AvailableDoctor, UserDoctorAccess } from "@/types";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { ToastType } from "@/types/toast.types";
import { Stethoscope } from "lucide-react";

interface DoctorAccessSectionProps {
  collaboratorId: string;
}

// ── SearchableMultiSelect ────────────────────────────────────────────────────
interface SearchableMultiSelectProps {
  options: AvailableDoctor[];
  selected: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
}

function SearchableMultiSelect({
  options,
  selected,
  onToggle,
  placeholder = "Buscar médico...",
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const openDropdown = () => {
    if (inputWrapperRef.current) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setOpen(true);
  };

  // Atualiza posição do dropdown ao rolar a tela
  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      if (inputWrapperRef.current) {
        const rect = inputWrapperRef.current.getBoundingClientRect();
        setDropdownStyle({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    }
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(
    () =>
      options.filter(
        (o) =>
          !selected.includes(o.id) &&
          o.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [options, query, selected],
  );

  const selectedOptions = useMemo(
    () => options.filter((o) => selected.includes(o.id)),
    [options, selected],
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Input trigger */}
      <div
        ref={inputWrapperRef}
        className={`flex items-center gap-2 min-h-10 px-3 py-2 border rounded-xl cursor-text transition-colors ${
          open
            ? "border-teal-600 ring-1 ring-teal-600/20"
            : "border-neutral-200 hover:border-neutral-300"
        }`}
        onClick={openDropdown}
      >
        <svg
          className="w-4 h-4 text-neutral-400 flex-shrink-0"
          viewBox="0 0 16 16"
          fill="none"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M11 11l3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            openDropdown();
          }}
          onFocus={openDropdown}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 text-sm outline-none bg-transparent text-neutral-700 placeholder:text-neutral-400"
        />
        {selected.length > 0 && (
          <span className="flex-shrink-0 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
            {selected.length} selecionado{selected.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Tags dos selecionados */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full pl-2.5 pr-1.5 py-1"
            >
              {opt.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(opt.id);
                }}
                className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-teal-200 transition-colors"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M7 1L1 7M1 1l6 6"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown via portal para escapar de overflow:hidden */}
      {open &&
        dropdownStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
              zIndex: 9999,
            }}
            className="bg-white border border-neutral-200 rounded-xl shadow-lg max-h-52 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">
                Nenhum resultado
              </p>
            ) : (
              filtered.map((opt) => {
                const isChecked = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onToggle(opt.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                  >
                    <div
                      className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                        isChecked
                          ? "bg-teal-700 border-teal-700"
                          : "border-neutral-300 bg-white"
                      }`}
                    >
                      {isChecked && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path
                            d="M1 3.5L3.5 6L8 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-700 leading-tight truncate">
                        {opt.name}
                      </p>
                      {(opt.crm || opt.specialty) && (
                        <p className="text-xs text-neutral-400 truncate">
                          {opt.crm
                            ? `CRM ${opt.crm}${opt.crm_state ? `/${opt.crm_state}` : ""}`
                            : ""}
                          {opt.crm && opt.specialty ? " · " : ""}
                          {opt.specialty ?? ""}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ── DoctorAccessSection ──────────────────────────────────────────────────────
export function DoctorAccessSection({
  collaboratorId,
}: DoctorAccessSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountDoctors, setAccountDoctors] = useState<AvailableDoctor[]>([]);
  const [_currentAccess, setCurrentAccess] = useState<UserDoctorAccess[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [originalSelectedIds, setOriginalSelectedIds] = useState<string[]>([]);
  const { toast, showToast, hideToast } = useToast();

  const isDirty =
    selectedDoctorIds.length !== originalSelectedIds.length ||
    selectedDoctorIds.some((id) => !originalSelectedIds.includes(id));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [doctors, access] = await Promise.all([
        availableDoctorsService.getDoctorsForAccount(),
        userDoctorAccessService.getAccessForUser(collaboratorId),
      ]);

      setAccountDoctors(doctors);
      setCurrentAccess(access);

      const activeIds = access
        .filter((a) => a.status === "active")
        .map((a) => a.doctor_user_id);

      setSelectedDoctorIds(activeIds);
      setOriginalSelectedIds(activeIds);
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
    setSelectedDoctorIds((prev) =>
      prev.includes(doctorId)
        ? prev.filter((id) => id !== doctorId)
        : [...prev, doctorId],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userDoctorAccessService.setAccessForUser(
        collaboratorId,
        selectedDoctorIds,
      );
      setOriginalSelectedIds([...selectedDoctorIds]);
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

        <SearchableMultiSelect
          options={accountDoctors}
          selected={selectedDoctorIds}
          onToggle={toggleDoctor}
          placeholder="Buscar médico..."
        />

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
