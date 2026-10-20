import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import type { ToastType } from "@/types/toast.types";

export interface UseEntityDetailFormOptions<TEntity, TForm> {
  entity: TEntity | null | undefined;
  emptyForm: TForm;
  toForm: (entity: TEntity) => TForm;
  save: (entity: TEntity, form: TForm) => Promise<unknown>;
  validate?: (form: TForm) => string | null;
  normalize?: (form: TForm) => TForm;
  showToast: (message: string, type?: ToastType) => void;
  successMessage: string;
  backHref: string;
}

export function useEntityDetailForm<
  TEntity extends { id: string },
  TForm extends object,
>({
  entity,
  emptyForm,
  toForm,
  save,
  validate,
  normalize,
  showToast,
  successMessage,
  backHref,
}: UseEntityDetailFormOptions<TEntity, TForm>) {
  const router = useRouter();
  const [formData, setFormData] = useState<TForm>(emptyForm);
  const [originalData, setOriginalData] = useState<TForm | null>(null);
  const [saving, setSaving] = useState(false);
  const filledFor = useRef<string | null>(null);

  const toFormRef = useRef(toForm);
  toFormRef.current = toForm;

  useEffect(() => {
    if (!entity || filledFor.current === entity.id) return;
    filledFor.current = entity.id;
    const initial = toFormRef.current(entity);
    setFormData(initial);
    setOriginalData(initial);
  }, [entity]);

  const isDirty =
    originalData !== null &&
    JSON.stringify(formData) !== JSON.stringify(originalData);

  const setField = useCallback(
    <K extends keyof TForm>(field: K, value: TForm[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSave = async () => {
    if (!entity) return;
    const error = validate?.(formData);
    if (error) {
      showToast(error, "error");
      return;
    }
    const normalized = normalize ? normalize(formData) : formData;
    setSaving(true);
    try {
      await save(entity, normalized);
      setFormData(normalized);
      setOriginalData(normalized);
      showToast(successMessage, "success");
    } catch (err) {
      logger.error("Erro ao salvar:", err);
      showToast("Erro ao salvar as alterações.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && originalData) {
      setFormData(originalData);
    } else {
      router.push(backHref);
    }
  };

  return {
    formData,
    setFormData,
    setField,
    isDirty,
    saving,
    handleSave,
    handleCancel,
  };
}
