import { useEffect, useState } from "react";
import { dateKey } from "@/lib/calendar";

/** Milissegundos até a próxima meia-noite local (+1 s de folga). */
function msAteAMeiaNoite(agora: Date): number {
  const meiaNoite = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate() + 1,
  );
  return meiaNoite.getTime() - agora.getTime() + 1000;
}

/**
 * Dia local corrente (`YYYY-MM-DD`) que acompanha a virada do dia. Tela que
 * monta um recorte "de hoje" e fica aberta de um dia para o outro (o hub de
 * Atendimento na recepção) precisava dele na dependência do memo — com só
 * `new Date()` no primeiro render, a aba "Hoje" continuava no dia anterior.
 *
 * Atualiza por timer na meia-noite e também ao voltar para a janela/aba
 * (timer de aba em segundo plano e computador suspenso atrasam ou pulam).
 */
export function useDiaAtual(): string {
  const [dia, setDia] = useState(() => dateKey(new Date()));

  useEffect(() => {
    const conferir = () => setDia(dateKey(new Date()));

    let timer: ReturnType<typeof setTimeout>;
    const agendar = () => {
      timer = setTimeout(() => {
        conferir();
        agendar();
      }, msAteAMeiaNoite(new Date()));
    };
    agendar();

    const aoVoltar = () => {
      if (document.visibilityState === "hidden") return;
      conferir();
      clearTimeout(timer);
      agendar();
    };
    window.addEventListener("focus", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", aoVoltar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, []);

  return dia;
}

/** `YYYY-MM-DD` → `Date` à meia-noite local. */
export function diaParaData(dia: string): Date {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(y, m - 1, d);
}
