"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { patientService, Patient } from "@/services/patient.service";
import { uploadService } from "@/services/upload.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { getInitials, getAvatarColor, cn } from "@/lib/utils";

/** Mesmo teto e mesmos tipos que o backend aceita na pasta `patient-photos`. */
export const PATIENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PATIENT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Foto do paciente: mostra a foto (ou as iniciais) e permite enviar, trocar e
 * remover. Salva na hora, independente do formulário de cadastro — a foto não
 * entra no "tem alteração não salva" do formulário ao lado.
 *
 * A pasta `patient-photos` é escopada pela conta no backend: o caminho
 * devolvido pelo upload só é aceito pelo `PATCH /patients/:id` se for da
 * própria conta.
 */
export function PatientPhotoField({
  patient,
  onChange,
}: {
  patient: Pick<Patient, "id" | "name" | "photoUrl">;
  onChange: (patient: Patient) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPhoto = Boolean(patient.photoUrl);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!PATIENT_PHOTO_TYPES.includes(file.type)) {
      setError("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > PATIENT_PHOTO_MAX_BYTES) {
      setError("A foto deve ter no máximo 2 MB.");
      return;
    }

    setBusy(true);
    try {
      const uploaded = await uploadService.uploadSingle(
        file,
        "patient-photos",
      );
      const saved = await patientService.update(patient.id, {
        photoPath: uploaded.data.path,
      });
      onChange(saved);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível salvar a foto."));
    } finally {
      setBusy(false);
      // Permite escolher o mesmo arquivo de novo depois de um erro.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setError(null);
    setBusy(true);
    try {
      onChange(await patientService.update(patient.id, { photoPath: null }));
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível remover a foto."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 shrink-0">
        {patient.photoUrl ? (
          <Image
            src={patient.photoUrl}
            alt={`Foto de ${patient.name}`}
            width={64}
            height={64}
            // URL assinada muda a cada leitura: passar pelo otimizador só
            // encheria o cache com versões da mesma foto.
            unoptimized
            className="w-16 h-16 rounded-2xl object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-semibold",
              getAvatarColor(patient.name),
            )}
          >
            {getInitials(patient.name)}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-teal-700 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            {hasPhoto ? "Trocar foto" : "Adicionar foto"}
          </button>
          {hasPhoto && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-500">JPG, PNG ou WEBP, até 2 MB.</p>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PATIENT_PHOTO_TYPES.join(",")}
        className="hidden"
        data-testid="patient-photo-input"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
