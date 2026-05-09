"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { getApiErrorMessage } from "@/lib/http-error";
import { billingService } from "@/services/billing.service";
import type { SavePaymentMethodPayload } from "@/types";
import { Lock, ShieldCheck, Loader2, MapPin } from "lucide-react";
import { useZodForm } from "@/hooks/useZodForm";
import { addCardSchema, type AddCardInput } from "@/lib/schemas/billing.schema";
import { unmask, maskCpfCnpj, maskPhone } from "@/lib/masks";
import { summarizeErrors } from "@/lib/form-errors";
import { useCepLookup } from "@/hooks/useCepLookup";
import type { CepLookupResult } from "@/lib/cep";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Dados do titular pré-preenchidos a partir do cadastro do usuário. */
  defaults?: Partial<
    Pick<
      SavePaymentMethodPayload,
      "holderInfoName" | "holderInfoEmail" | "holderInfoCpfCnpj" | "holderInfoPhone"
    >
  >;
}

const FIELD_LABELS: Record<string, string> = {
  number: "Número do cartão",
  holderName: "Nome impresso no cartão",
  expiry: "Validade",
  ccv: "CCV",
  holderInfoName: "Nome do titular",
  holderInfoEmail: "E-mail do titular",
  holderInfoCpfCnpj: "CPF/CNPJ",
  holderInfoPhone: "Telefone",
  holderInfoPostalCode: "CEP",
  holderInfoAddressNumber: "Número do endereço",
  holderInfoAddressComplement: "Complemento",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

function formatCardNumber(value: string): string {
  return onlyDigits(value)
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function buildInitialValues(defaults: Props["defaults"]): AddCardInput {
  return {
    number: "",
    holderName: "",
    expiry: "",
    ccv: "",
    holderInfoName: defaults?.holderInfoName ?? "",
    holderInfoEmail: defaults?.holderInfoEmail ?? "",
    holderInfoCpfCnpj: defaults?.holderInfoCpfCnpj
      ? maskCpfCnpj(defaults.holderInfoCpfCnpj)
      : "",
    holderInfoPostalCode: "",
    holderInfoAddressNumber: "",
    holderInfoAddressComplement: "",
    holderInfoPhone: defaults?.holderInfoPhone
      ? maskPhone(defaults.holderInfoPhone)
      : "",
  };
}

export function AddCardModal({
  isOpen,
  onClose,
  onSuccess,
  defaults = {},
}: Props) {
  const { toast, showToast, hideToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [cepAddress, setCepAddress] = useState<CepLookupResult | null>(null);

  const form = useZodForm({
    schema: addCardSchema,
    initialValues: buildInitialValues(defaults),
  });

  const { loading: cepLoading } = useCepLookup({
    cep: form.values.holderInfoPostalCode,
    enabled: isOpen,
    onResolved: (data) => setCepAddress(data),
    onError: (err) => {
      setCepAddress(null);
      if (err.code === "not_found") {
        showToast("CEP não encontrado.", "error");
      } else if (err.code === "network") {
        showToast(err.message, "error");
      }
    },
  });

  // Atualiza valores iniciais quando defaults mudam (ex.: dados do usuário carregam tarde).
  useEffect(() => {
    form.reset(buildInitialValues(defaults));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    defaults.holderInfoName,
    defaults.holderInfoEmail,
    defaults.holderInfoCpfCnpj,
    defaults.holderInfoPhone,
  ]);

  const onSubmit = form.handleSubmit(
    async (data) => {
      const expiryDigits = onlyDigits(data.expiry);
      const expiryMonth = expiryDigits.slice(0, 2);
      const expiryYear = `20${expiryDigits.slice(2, 4)}`;

      const payload: SavePaymentMethodPayload = {
        number: unmask(data.number),
        holderName: data.holderName.trim(),
        expiryMonth,
        expiryYear,
        ccv: data.ccv,
        holderInfoName: data.holderInfoName.trim(),
        holderInfoEmail: data.holderInfoEmail.trim(),
        holderInfoCpfCnpj: unmask(data.holderInfoCpfCnpj),
        holderInfoPostalCode: unmask(data.holderInfoPostalCode),
        holderInfoAddressNumber: data.holderInfoAddressNumber.trim(),
        holderInfoAddressComplement:
          data.holderInfoAddressComplement?.trim() || undefined,
        holderInfoPhone: data.holderInfoPhone
          ? unmask(data.holderInfoPhone)
          : undefined,
      };

      try {
        setSubmitting(true);
        await billingService.addPaymentMethod(payload);
        showToast("Cartão cadastrado com sucesso.", "success");
        form.reset(buildInitialValues(defaults));
        onSuccess();
        onClose();
      } catch (err) {
        showToast(getApiErrorMessage(err), "error");
      } finally {
        setSubmitting(false);
      }
    },
    (errs) => showToast(summarizeErrors(errs, FIELD_LABELS), "error"),
  );

  const handleClose = () => {
    if (submitting) return;
    form.reset(buildInitialValues(defaults));
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Cadastrar cartão de crédito"
        size="md"
      >
        <form onSubmit={onSubmit} noValidate className="p-5 md:p-6 space-y-5">
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Os dados do cartão são enviados diretamente para o gateway
              certificado PCI-DSS. Não armazenamos número completo nem CCV.
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">
              Dados do cartão
            </h4>
            <Input
              label="Número do cartão"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              required
              value={form.values.number}
              onChange={(e) =>
                form.setField("number", formatCardNumber(e.target.value))
              }
              error={form.errors.number}
            />
            <Input
              label="Nome impresso no cartão"
              autoComplete="cc-name"
              placeholder="Como aparece no cartão"
              required
              {...form.getFieldProps("holderName")}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Validade"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                required
                value={form.values.expiry}
                onChange={(e) =>
                  form.setField("expiry", formatExpiry(e.target.value))
                }
                error={form.errors.expiry}
              />
              <Input
                label="CCV"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="000"
                maxLength={4}
                required
                value={form.values.ccv}
                onChange={(e) =>
                  form.setField("ccv", onlyDigits(e.target.value).slice(0, 4))
                }
                error={form.errors.ccv}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">
              Dados do titular
            </h4>
            <Input
              label="Nome completo"
              required
              {...form.getFieldProps("holderInfoName")}
            />
            <Input
              label="E-mail"
              type="email"
              required
              {...form.getFieldProps("holderInfoEmail")}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CPF/CNPJ"
                mask="cpfCnpj"
                required
                {...form.getFieldProps("holderInfoCpfCnpj")}
              />
              <Input
                label="Telefone"
                type="tel"
                mask="phone"
                {...form.getFieldProps("holderInfoPhone")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  label="CEP"
                  mask="cep"
                  required
                  {...form.getFieldProps("holderInfoPostalCode")}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-9 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </div>
              <Input
                label="Número"
                required
                {...form.getFieldProps("holderInfoAddressNumber")}
              />
            </div>
            {cepAddress && (
              <p className="flex items-center gap-1.5 text-xs text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {[
                  cepAddress.logradouro,
                  cepAddress.bairro,
                  cepAddress.cidade && cepAddress.uf
                    ? `${cepAddress.cidade} - ${cepAddress.uf}`
                    : cepAddress.cidade || cepAddress.uf,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            <Input
              label="Complemento (opcional)"
              {...form.getFieldProps("holderInfoAddressComplement")}
            />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
            <Lock className="w-3.5 h-3.5" />
            Conexão criptografada — TLS 1.2+
          </div>

          <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              Salvar cartão
            </Button>
          </div>
        </form>
      </Modal>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </>
  );
}
