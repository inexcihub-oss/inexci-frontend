import { z } from "zod";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const reportPeriodSchema = z
  .object({
    from: z.string().regex(DATA_ISO, "Informe a data inicial."),
    to: z.string().regex(DATA_ISO, "Informe a data final."),
  })
  .refine((periodo) => periodo.from <= periodo.to, {
    message: "A data inicial deve ser anterior ou igual à final.",
    path: ["to"],
  });

export type ReportPeriod = z.output<typeof reportPeriodSchema>;

export function primeiroDiaDoMes(hoje: string): string {
  return `${hoje.slice(0, 8)}01`;
}

export function erroDoPeriodo(periodo: {
  from: string;
  to: string;
}): string | null {
  const resultado = reportPeriodSchema.safeParse(periodo);
  return resultado.success ? null : resultado.error.issues[0].message;
}
