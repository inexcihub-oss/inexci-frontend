"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { patientService, PatientListItem } from "@/services/patient.service";

/**
 * Outros pacientes da conta com o mesmo CPF. CPF repetido é permitido de
 * propósito (veio assim do Feegow, e nem sempre é a mesma pessoa — mesclar
 * arriscaria perder prontuário), mas quem cadastra precisa saber para não
 * duplicar alguém sem querer. Só avisa: nunca bloqueia nem mescla.
 *
 * Consulta só com o CPF completo (11 dígitos); falha de rede some em
 * silêncio — o aviso é ajuda, não validação.
 */
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

  // Enquanto o debounce não alcança o que está digitado, não mostra aviso de
  // um CPF que já mudou.
  return digitos === consulta ? repetidos : [];
}

export function mensagemCpfRepetido(repetidos: { name: string }[]): string | null {
  if (repetidos.length === 0) return null;
  const nomes = repetidos.map((p) => p.name).join(", ");
  return repetidos.length === 1
    ? `Já existe um paciente com este CPF: ${nomes}. Confira se não é a mesma pessoa antes de salvar.`
    : `Já existem ${repetidos.length} pacientes com este CPF: ${nomes}. Confira se não é a mesma pessoa antes de salvar.`;
}
