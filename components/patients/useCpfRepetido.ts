"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { patientService, PatientListItem } from "@/services/patient.service";

export function useCpfRepetido(cpf: string, ignorarId?: string) {
  const digitos = (cpf ?? "").replace(/\D/g, "");
  const consulta = useDebounce(digitos, 400);
  const [repetidos, setRepetidos] = useState<PatientListItem[]>([]);

  useEffect(() => {
    if (consulta.length !== 11) {
      setRepetidos([]);
      return;
    }
    let ativo = true;
    Promise.resolve()
      .then(() => patientService.list({ search: consulta, take: 5 }))
      .then(({ records }) => {
        if (!ativo) return;
        setRepetidos(
          records.filter(
            (p) =>
              p.id !== ignorarId && (p.cpf ?? "").replace(/\D/g, "") === consulta,
          ),
        );
      })
      .catch(() => {
        if (ativo) setRepetidos([]);
      });
    return () => {
      ativo = false;
    };
  }, [consulta, ignorarId]);

  return digitos === consulta ? repetidos : [];
}

export function mensagemCpfRepetido(repetidos: { name: string }[]): string | null {
  if (repetidos.length === 0) return null;
  const nomes = repetidos.map((p) => p.name).join(", ");
  return repetidos.length === 1
    ? `Já existe um paciente com este CPF: ${nomes}. Confira se não é a mesma pessoa antes de salvar.`
    : `Já existem ${repetidos.length} pacientes com este CPF: ${nomes}. Confira se não é a mesma pessoa antes de salvar.`;
}
