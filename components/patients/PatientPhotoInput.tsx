"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, User } from "lucide-react";
import { PATIENT_PHOTO_TYPES, prepararFotoPaciente } from "./foto-paciente";
import { WebcamCaptureModal } from "./WebcamCaptureModal";

export function PatientPhotoInput({
  value,
  onChange,
}: {
  value: File | null;
  onChange: (foto: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const previa = useMemo(
    () => (value ? URL.createObjectURL(value) : null),
    [value],
  );
  useEffect(
    () => () => {
      if (previa) URL.revokeObjectURL(previa);
    },
    [previa],
  );

  const escolher = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    const { foto, erro: problema } = await prepararFotoPaciente(file);
    setErro(problema ?? null);
    if (foto) onChange(foto);
  };

  const botao =
    "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors";

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-neutral-400">
        {previa ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:)
          <img
            src={previa}
            alt="Prévia da foto do paciente"
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-7 w-7" aria-hidden="true" />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="ds-label mb-0">Foto (opcional)</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`${botao} border-neutral-200 text-neutral-700 hover:bg-neutral-50`}
          >
            <ImagePlus className="h-4 w-4" />
            {value ? "Trocar arquivo" : "Enviar arquivo"}
          </button>
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setCamera(true);
            }}
            className={`${botao} border-neutral-200 text-neutral-700 hover:bg-neutral-50`}
          >
            <Camera className="h-4 w-4" />
            Tirar foto
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className={`${botao} border-red-200 text-red-600 hover:bg-red-50`}
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </button>
          )}
        </div>
        {erro && (
          <p role="alert" className="text-xs text-red-600">
            {erro}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PATIENT_PHOTO_TYPES.join(",")}
        className="hidden"
        data-testid="new-patient-photo-input"
        onChange={(e) => escolher(e.target.files?.[0])}
      />

      {camera && (
        <WebcamCaptureModal
          onClose={() => setCamera(false)}
          onCapture={(foto) => {
            setCamera(false);
            escolher(foto);
          }}
        />
      )}
    </div>
  );
}
