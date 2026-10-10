"use client";

import { useState } from "react";
import { hospitalService } from "@/services/hospital.service";
import { Modal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { useZodForm } from "@/hooks/useZodForm";
import { newHospitalSchema } from "@/lib/schemas/hospital.schema";
import { STATE_UF_OPTIONS } from "@/lib/options";
import { unmask } from "@/lib/masks";
import { getApiErrorMessage } from "@/lib/http-error";

interface NewHospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UF_OPTIONS = [
  { value: "", label: "Selecione" },
  ...STATE_UF_OPTIONS.slice(1),
];

export function NewHospitalModal({
  isOpen,
  onClose,
  onSuccess,
}: NewHospitalModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useZodForm({
    schema: newHospitalSchema,
    initialValues: {
      name: "",
      cnpj: "",
      phone: "",
      email: "",
      city: "",
      state: "",
    },
  });

  const handleClose = () => {
    if (loading) return;
    form.reset();
    setError("");
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true);
    setError("");
    try {
      await hospitalService.create({
        name: data.name,
        cnpj: unmask(data.cnpj) || undefined,
        phone: unmask(data.phone) || undefined,
        email: data.email || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
      });
      onSuccess();
      form.reset();
      onClose();
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Erro ao criar hospital. Tente novamente."),
      );
    } finally {
      setLoading(false);
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Novo hospital"
      disableClose={loading}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome"
              placeholder="Nome do hospital"
              {...form.getFieldProps("name")}
            />
            <Input
              label="CNPJ (opcional)"
              mask="cnpj"
              placeholder="12.345.678/0001-90"
              {...form.getFieldProps("cnpj")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Telefone (opcional)"
              type="tel"
              mask="phone"
              placeholder="(21) 98765-4321"
              {...form.getFieldProps("phone")}
            />
            <Input
              label="E-mail (opcional)"
              type="email"
              placeholder="hospital@mail.com"
              {...form.getFieldProps("email")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cidade (opcional)"
              placeholder="Cidade"
              {...form.getFieldProps("city")}
            />
            <Select
              label="Estado (opcional)"
              options={UF_OPTIONS}
              {...form.getFieldProps("state")}
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>

        <ModalFooter align="end">
          <button type="submit" disabled={loading} className="ds-btn-primary">
            {loading ? "Adicionando..." : "Adicionar hospital"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
