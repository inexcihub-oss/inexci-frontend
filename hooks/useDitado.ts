"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/http-error";

export type EstadoDitado = "parado" | "gravando" | "transcrevendo";

export const DITADO_MAX_SEGUNDOS = 290;

const FORMATOS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

export function ditadoSuportado(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function formatoSuportado(): string | undefined {
  return FORMATOS.find((formato) => MediaRecorder.isTypeSupported(formato));
}

function mensagemDoMicrofone(erro: unknown): string {
  const nome = erro instanceof DOMException ? erro.name : "";
  if (nome === "NotAllowedError" || nome === "SecurityError")
    return "Permita o uso do microfone no navegador para ditar.";
  if (nome === "NotFoundError")
    return "Nenhum microfone encontrado neste dispositivo.";
  return "Não foi possível acessar o microfone.";
}

export function useDitado(
  transcrever: ((audio: Blob) => Promise<string>) | undefined,
  aoTranscrever: (texto: string) => void,
) {
  const [estado, setEstado] = useState<EstadoDitado>("parado");
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const trechos = useRef<Blob[]>([]);
  const cancelado = useRef(false);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);
  const aoTranscreverRef = useRef(aoTranscrever);
  const transcreverRef = useRef(transcrever);

  useEffect(() => {
    aoTranscreverRef.current = aoTranscrever;
    transcreverRef.current = transcrever;
  });

  const pararRelogio = () => {
    if (relogio.current) clearInterval(relogio.current);
    relogio.current = null;
  };

  const encerrarGravacao = useCallback((descartar: boolean) => {
    cancelado.current = descartar;
    const atual = gravador.current;
    if (atual && atual.state !== "inactive") atual.stop();
  }, []);

  useEffect(
    () => () => {
      pararRelogio();
      cancelado.current = true;
      const atual = gravador.current;
      if (atual && atual.state !== "inactive") atual.stop();
      atual?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const iniciar = useCallback(async () => {
    if (!transcreverRef.current || gravador.current?.state === "recording")
      return;
    setErro(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (falha) {
      setErro(mensagemDoMicrofone(falha));
      return;
    }

    const formato = formatoSuportado();
    const novo = new MediaRecorder(
      stream,
      formato ? { mimeType: formato } : undefined,
    );
    trechos.current = [];
    cancelado.current = false;
    novo.ondataavailable = (evento) => {
      if (evento.data.size > 0) trechos.current.push(evento.data);
    };
    novo.onstop = async () => {
      pararRelogio();
      stream.getTracks().forEach((track) => track.stop());
      gravador.current = null;
      const audio = new Blob(trechos.current, {
        type: novo.mimeType || formato || "audio/webm",
      });
      trechos.current = [];
      if (cancelado.current || audio.size === 0 || !transcreverRef.current) {
        setEstado("parado");
        return;
      }
      setEstado("transcrevendo");
      try {
        const texto = (await transcreverRef.current(audio)).trim();
        if (texto) aoTranscreverRef.current(texto);
        else setErro("Não entendi o áudio. Tente de novo.");
      } catch (falha) {
        setErro(
          getApiErrorMessage(falha, "Não foi possível transcrever o áudio."),
        );
      } finally {
        setEstado("parado");
      }
    };

    gravador.current = novo;
    novo.start();
    setSegundos(0);
    setEstado("gravando");
    relogio.current = setInterval(() => {
      setSegundos((atual) => {
        const proximo = atual + 1;
        if (proximo >= DITADO_MAX_SEGUNDOS) encerrarGravacao(false);
        return proximo;
      });
    }, 1000);
  }, [encerrarGravacao]);

  return {
    estado,
    segundos,
    erro,
    limparErro: () => setErro(null),
    iniciar,
    parar: () => encerrarGravacao(false),
    cancelar: () => encerrarGravacao(true),
  };
}
