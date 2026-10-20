import { useEffect, useState } from "react";
import { dateKey } from "@/lib/calendar";

function msAteAMeiaNoite(agora: Date): number {
  const meiaNoite = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate() + 1,
  );
  return meiaNoite.getTime() - agora.getTime() + 1000;
}

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

export function diaParaData(dia: string): Date {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(y, m - 1, d);
}
