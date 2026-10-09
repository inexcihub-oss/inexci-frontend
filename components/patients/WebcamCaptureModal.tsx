"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Loader2, RotateCcw, X } from "lucide-react";
import { desenharReduzido } from "./foto-paciente";

type Estado = "abrindo" | "ao-vivo" | "capturada" | "erro";

export const PRAZO_CAMERA_MS = 15_000;

export const MENSAGEM_PRAZO_CAMERA =
  "A câmera não respondeu. Se o navegador estiver perguntando se este site pode usar a câmera, clique em Permitir e depois em Tentar de novo.";


function mensagemDeErro(erro: unknown): string {
  const nome = (erro as { name?: string } | null)?.name;
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    return "O acesso à câmera foi bloqueado. Libere a câmera para este site nas configurações do navegador e tente de novo.";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") {
    return "Nenhuma câmera foi encontrada neste dispositivo.";
  }
  if (nome === "NotReadableError") {
    return "A câmera está sendo usada por outro programa. Feche-o e tente de novo.";
  }
  return "Não foi possível abrir a câmera.";
}

export function WebcamCaptureModal({
  onClose,
  onCapture,
}: {
  onClose: () => void;
  onCapture: (foto: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [estado, setEstado] = useState<Estado>("abrindo");
  const [erro, setErro] = useState("");
  const [captura, setCaptura] = useState<{ url: string; blob: Blob } | null>(
    null,
  );

  const montadoRef = useRef(false);
  const pedidoRef = useRef(0);
  const prazoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limparPrazo = useCallback(() => {
    if (prazoRef.current) clearTimeout(prazoRef.current);
    prazoRef.current = null;
  }, []);

  const desligar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const ligar = useCallback(async () => {
    const pedido = ++pedidoRef.current;
    limparPrazo();
    setEstado("abrindo");
    setErro("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setErro(
        "Este navegador não permite usar a câmera aqui. Envie uma foto do dispositivo.",
      );
      setEstado("erro");
      return;
    }
    prazoRef.current = setTimeout(() => {
      prazoRef.current = null;
      if (!montadoRef.current || pedido !== pedidoRef.current) return;
      pedidoRef.current += 1;
      setErro(MENSAGEM_PRAZO_CAMERA);
      setEstado("erro");
    }, PRAZO_CAMERA_MS);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      if (!montadoRef.current || pedido !== pedidoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      limparPrazo();
      if (streamRef.current && streamRef.current !== stream) desligar();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      if (!montadoRef.current) return;
      setEstado("ao-vivo");
    } catch (e) {
      if (!montadoRef.current || pedido !== pedidoRef.current) return;
      limparPrazo();
      setErro(mensagemDeErro(e));
      setEstado("erro");
    }
  }, [desligar, limparPrazo]);

  useEffect(() => {
    montadoRef.current = true;
    ligar();
    return () => {
      montadoRef.current = false;
      pedidoRef.current += 1;
      limparPrazo();
      desligar();
    };
  }, [ligar, desligar, limparPrazo]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [onClose]);

  useEffect(
    () => () => {
      if (captura) URL.revokeObjectURL(captura.url);
    },
    [captura],
  );

  const capturar = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = desenharReduzido(video, video.videoWidth, video.videoHeight);
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCaptura({ url: URL.createObjectURL(blob), blob });
        setEstado("capturada");
      },
      "image/jpeg",
      0.9,
    );
  };

  const tirarOutra = () => {
    setCaptura(null);
    setEstado("ao-vivo");
  };

  const usar = () => {
    if (!captura) return;
    desligar();
    onCapture(
      new File([captura.blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }),
    );
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tirar foto"
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-neutral-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:mx-4 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="ds-modal-title">Tirar foto</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar câmera"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full bg-neutral-900">
          <video
            ref={videoRef}
            data-testid="webcam-video"
            playsInline
            muted
            className={`h-full w-full -scale-x-100 object-cover ${estado === "ao-vivo" ? "" : "invisible"}`}
          />
          {estado === "capturada" && captura && (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:), não passa pelo otimizador
            <img
              src={captura.url}
              alt="Foto capturada"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {estado === "abrindo" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
              <Loader2 className="h-6 w-6 animate-spin" />
              Abrindo a câmera…
            </div>
          )}
          {estado === "erro" && (
            <div
              role="alert"
              className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white"
            >
              {erro}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
          {estado === "capturada" ? (
            <>
              <button
                type="button"
                onClick={tirarOutra}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4" />
                Tirar outra
              </button>
              <button
                type="button"
                onClick={usar}
                className="ds-btn-primary min-h-[44px]"
              >
                Usar esta foto
              </button>
            </>
          ) : estado === "erro" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={ligar}
                className="ds-btn-primary min-h-[44px]"
              >
                Tentar de novo
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={capturar}
              disabled={estado !== "ao-vivo"}
              className="ds-btn-primary inline-flex min-h-[44px] items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              Capturar
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
