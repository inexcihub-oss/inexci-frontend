"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Maximize2, Trash2 } from "lucide-react";
import { PatientPhotoViewer } from "./PatientPhotoViewer";
import { patientService, Patient } from "@/services/patient.service";
import { uploadService } from "@/services/upload.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { getInitials, getAvatarColor, cn } from "@/lib/utils";

/** Mesmo teto e mesmos tipos que o backend aceita na pasta `patient-photos`. */
export const PATIENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PATIENT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Foto do paciente no avatar do cartão do nome: clicar no avatar envia ou
 * troca a foto; o botão no canto remove. Sem foto, mostra as iniciais. Salva na hora, independente do formulário de cadastro — a foto não
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
  const [ampliada, setAmpliada] = useState(false);

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
      setAmpliada(false);
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
      setAmpliada(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível remover a foto."));
    } finally {
      setBusy(false);
    }
  };

  const tamanho = "w-14 h-14 lg:w-20 lg:h-20 rounded-xl";

  return (
    <div className="relative shrink-0">
      {/* O próprio avatar troca a foto: é o lugar onde a foto aparece. */}
      {/* Com foto, o clique amplia (trocar e remover ficam na foto
          ampliada); sem foto, abre o seletor para adicionar. */}
      <button
        type="button"
        onClick={() =>
          hasPhoto ? setAmpliada(true) : inputRef.current?.click()
        }
        disabled={busy}
        aria-label={hasPhoto ? "Ver foto" : "Adicionar foto"}
        title={
          hasPhoto ? "Ver foto" : "Adicionar foto (JPG, PNG ou WEBP, até 2 MB)"
        }
        className={cn(
          "group relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
          tamanho,
        )}
      >
        {patient.photoUrl ? (
          <Image
            src={patient.photoUrl}
            alt={`Foto de ${patient.name}`}
            width={80}
            height={80}
            // URL assinada muda a cada leitura: passar pelo otimizador só
            // encheria o cache com versões da mesma foto.
            unoptimized
            className={cn("object-cover", tamanho)}
          />
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              "flex items-center justify-center text-xl lg:text-2xl font-semibold",
              tamanho,
              getAvatarColor(patient.name),
            )}
          >
            {getInitials(patient.name)}
          </span>
        )}
        {/* Câmera: aparece sempre no toque (sem hover) e no hover do mouse. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {hasPhoto ? (
            <Maximize2 className="w-5 h-5 text-white" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </span>
        {!hasPhoto && (
          <span
            aria-hidden="true"
            className="absolute bottom-0.5 right-0.5 flex h-5 w-5 lg:h-6 lg:w-6 items-center justify-center rounded-full bg-white text-neutral-700 shadow ring-1 ring-neutral-200 group-hover:hidden"
          >
            <Camera className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="w-5 h-5 text-teal-700 animate-spin" />
          </span>
        )}
      </button>


      {error && (
        <p
          role="alert"
          className="absolute left-0 top-full mt-1 w-56 text-xs text-red-600"
        >
          {error}
        </p>
      )}

      {ampliada && patient.photoUrl && (
        <PatientPhotoViewer
          src={patient.photoUrl}
          nome={patient.name}
          onClose={() => setAmpliada(false)}
          acoes={
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                Trocar foto
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-red-600 hover:ring-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </button>
            </>
          }
        />
      )}

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
