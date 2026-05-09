"use client";

import { useCallback, useRef, useState } from "react";
import { z, ZodIssue } from "zod";

/**
 * Hook leve de formulário com Zod, sem dependência de react-hook-form.
 *
 * - `values`           → estado atual
 * - `errors`           → record `{ [field]: string }` (mensagem do primeiro issue)
 * - `setField(k, v)`   → atualiza um campo e limpa o erro daquele campo
 * - `setValues(p)`     → patch parcial
 * - `getFieldProps(k)` → `{ value, onChange, error }` para casar com `<Input>`
 * - `validate()`       → roda o schema, popula erros, retorna `{ success, data }`
 * - `handleSubmit(onValid, onInvalid?)` → wrapper de form submit
 * - `reset(values?)`   → volta ao initial (ou patch)
 */
export interface UseZodFormOptions<TSchema extends z.ZodTypeAny> {
  schema: TSchema;
  initialValues: z.input<TSchema>;
  /** Quando true, valida em cada change (default: false — valida só no submit). */
  validateOnChange?: boolean;
}

export interface FieldProps<V = string> {
  name: string;
  value: V;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
}

export interface UseZodFormReturn<TSchema extends z.ZodTypeAny> {
  values: z.input<TSchema>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  setField: <K extends keyof z.input<TSchema>>(key: K, value: z.input<TSchema>[K]) => void;
  setValues: (patch: Partial<z.input<TSchema>>) => void;
  getFieldProps: <K extends keyof z.input<TSchema>>(key: K) => FieldProps<z.input<TSchema>[K] extends string ? string : any>;
  validate: () => { success: true; data: z.output<TSchema> } | { success: false; errors: Record<string, string> };
  handleSubmit: (
    onValid: (data: z.output<TSchema>) => void | Promise<void>,
    onInvalid?: (errors: Record<string, string>) => void,
  ) => (e?: React.FormEvent) => Promise<void>;
  reset: (values?: Partial<z.input<TSchema>>) => void;
  setError: (field: string, message: string) => void;
  clearErrors: () => void;
}

function issuesToRecord(issues: ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.join(".") || "_root";
    if (!(path in out)) out[path] = issue.message;
  }
  return out;
}

export function useZodForm<TSchema extends z.ZodTypeAny>(
  options: UseZodFormOptions<TSchema>,
): UseZodFormReturn<TSchema> {
  const { schema, initialValues, validateOnChange = false } = options;
  const initialRef = useRef(initialValues);
  const [values, setValuesState] = useState<z.input<TSchema>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runValidate = useCallback(
    (current: z.input<TSchema>):
      | { success: true; data: z.output<TSchema> }
      | { success: false; errors: Record<string, string> } => {
      const result = schema.safeParse(current);
      if (result.success) {
        return { success: true, data: result.data as z.output<TSchema> };
      }
      return { success: false, errors: issuesToRecord(result.error.issues) };
    },
    [schema],
  );

  const setField = useCallback(
    <K extends keyof z.input<TSchema>>(key: K, value: z.input<TSchema>[K]) => {
      setValuesState((prev) => {
        const next = { ...(prev as object), [key]: value } as z.input<TSchema>;
        if (validateOnChange) {
          const r = runValidate(next);
          setErrors(r.success ? {} : r.errors);
        } else {
          setErrors((errs) => {
            if (!(String(key) in errs)) return errs;
            const { [String(key)]: _omit, ...rest } = errs;
            return rest;
          });
        }
        return next;
      });
    },
    [validateOnChange, runValidate],
  );

  const setValues = useCallback((patch: Partial<z.input<TSchema>>) => {
    setValuesState((prev) => ({ ...(prev as object), ...(patch as object) }) as z.input<TSchema>);
  }, []);

  const validate = useCallback(() => {
    const r = runValidate(values);
    setErrors(r.success ? {} : r.errors);
    return r;
  }, [runValidate, values]);

  const handleSubmit = useCallback(
    (
      onValid: (data: z.output<TSchema>) => void | Promise<void>,
      onInvalid?: (errors: Record<string, string>) => void,
    ) =>
      async (e?: React.FormEvent) => {
        if (e?.preventDefault) e.preventDefault();
        const r = runValidate(values);
        if (!r.success) {
          setErrors(r.errors);
          onInvalid?.(r.errors);
          return;
        }
        setErrors({});
        setIsSubmitting(true);
        try {
          await onValid(r.data);
        } finally {
          setIsSubmitting(false);
        }
      },
    [runValidate, values],
  );

  const reset = useCallback((next?: Partial<z.input<TSchema>>) => {
    setValuesState({ ...(initialRef.current as object), ...(next as object) } as z.input<TSchema>);
    setErrors({});
    setIsSubmitting(false);
  }, []);

  const setError = useCallback((field: string, message: string) => {
    setErrors((e) => ({ ...e, [field]: message }));
  }, []);

  const clearErrors = useCallback(() => setErrors({}), []);

  const getFieldProps = useCallback(
    <K extends keyof z.input<TSchema>>(key: K) => {
      const k = String(key);
      return {
        name: k,
        value: ((values as any)[k] ?? "") as any,
        onChange: (
          e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
        ) => {
          setField(key, e.target.value as any);
        },
        error: errors[k],
      };
    },
    [values, errors, setField],
  );

  return {
    values,
    errors,
    isSubmitting,
    setField,
    setValues,
    getFieldProps,
    validate,
    handleSubmit,
    reset,
    setError,
    clearErrors,
  };
}
