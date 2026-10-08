"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Loader2, RotateCcw, X } from "lucide-react";

type Estado = "abrindo" | "ao-vivo" | "capturada" | "erro";

/** Lado maior da foto capturada: o backend reduz para 800 px de qualquer jeito. */
const LADO_MAX_CAPTURA = 1280;

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

/**
 * Tira a foto do paciente pela câmera (webcam ou câmera frontal do celular).
 * Pré-visualização ao vivo, captura, "tirar outra" e só então "usar esta
 * foto". A câmera é desligada ao fechar — senão a luz da webcam continua
 * acesa depois que o modal some.
 */
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

  // Componente montado? Um `getUserMedia` que resolve depois do unmount (ou
  // depois que o StrictMode desmontou o primeiro efeito) não tem mais dono:
  // as tracks precisam ser paradas ali mesmo, senão a webcam fica acesa.
  const montadoRef = useRef(false);
  // Cada pedido de câmera ganha um número; só o mais recente pode assumir o
  // stream — um "tentar de novo" sobrepondo um pedido ainda pendente não
  // deixa o anterior ligado.
  const pedidoRef = useRef(0);

  const desligar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const ligar = useCallback(async () => {
    const pedido = ++pedidoRef.current;
    setEstado("abrindo");
    setErro("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setErro(
        "Este navegador não permite usar a câmera aqui. Envie uma foto do dispositivo.",
      );
      setEstado("erro");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      if (!montadoRef.current || pedido !== pedidoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
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
      setErro(mensagemDeErro(e));
      setEstado("erro");
    }
  }, [desligar]);

  useEffect(() => {
    montadoRef.current = true;
    ligar();
    return () => {
      montadoRef.current = false;
      // Invalida o pedido em andamento: quando ele resolver, para as tracks.
      pedidoRef.current += 1;
      desligar();
    };
  }, [ligar, desligar]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A câmera é a camada de cima: o Esc é dela e não chega às de baixo
      // (modal do cadastro, foto ampliada).
      e.stopImmediatePropagation();
      e.preventDefault();
      onClose();
    };
    // Captura na janela: roda antes dos ouvintes de `document`/`window` das
    // outras camadas, que então não recebem o Esc.
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [onClose]);

  // Libera a prévia anterior ao tirar outra ou fechar.
  useEffect(
    () => () => {
      if (captura) URL.revokeObjectURL(captura.url);
    },
    [captura],
  );

  const capturar = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const escala = Math.min(
      1,
      LADO_MAX_CAPTURA / Math.max(video.videoWidth, video.videoHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * escala);
    canvas.height = Math.round(video.videoHeight * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // A prévia é espelhada (como um espelho, mais natural para se enquadrar);
    // a foto salva não — senão texto e lado ficam invertidos no cadastro.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
          {/* O vídeo fica montado mesmo com a foto capturada: tirar outra
              volta para a imagem ao vivo sem pedir a câmera de novo. */}
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
