"use client";

import React, { useRef } from "react";
import { IconX } from "./SurgeryStatusIcons";

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  uploading: boolean;
}

export interface DocSection {
  key: string;
  label: string;
  optional: boolean;
  required: boolean;
  multiple: boolean;
  files: UploadFile[];
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

export function mkSections(): DocSection[] {
  return [
    {
      key: "surgery_room",
      label: "Descrição cirúrgica (Folha de sala)",
      optional: true,
      required: false,
      multiple: false,
      files: [],
    },
    {
      key: "surgery_images",
      label: "Imagens",
      optional: true,
      required: false,
      multiple: true,
      files: [],
    },
    {
      key: "surgery_auth_document",
      label: "Documento de autorização",
      optional: true,
      required: false,
      multiple: false,
      files: [],
    },
    {
      key: "additional_document",
      label: "Outros",
      optional: true,
      required: false,
      multiple: true,
      files: [],
    },
  ];
}

interface SurgeryDocumentSectionsProps {
  sections: DocSection[];
  isSaving: boolean;
  onAddFiles: (key: string, files: FileList | null) => void;
  onRemoveFile: (key: string, id: string) => void;
}

export function SurgeryDocumentSections({
  sections,
  isSaving,
  onAddFiles,
  onRemoveFile,
}: SurgeryDocumentSectionsProps) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {sections.map((sec) => (
        <div key={sec.key}>
          <input
            ref={(el) => {
              fileRefs.current[sec.key] = el;
            }}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            multiple={sec.multiple}
            className="hidden"
            onChange={(e) => {
              onAddFiles(sec.key, e.target.files);
              e.target.value = "";
            }}
          />

          {sec.files.length === 0 ? (
            <div className="flex items-center gap-2 pl-4 pr-2 py-2 bg-neutral-50 border border-dashed border-neutral-100 rounded-xl">
              <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900">
                {sec.label}
                {sec.optional && (
                  <span className="font-normal"> (Opcional)</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => fileRefs.current[sec.key]?.click()}
                className="ds-btn-outline flex-shrink-0"
              >
                Selecionar arquivo
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center">
                <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900">
                  {sec.label}
                  {sec.optional && (
                    <span className="font-normal"> (Opcional)</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => fileRefs.current[sec.key]?.click()}
                  className="text-xs md:text-sm text-neutral-900 underline"
                >
                  Adicionar arquivo
                </button>
              </div>

              {sec.files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 px-4 py-2 border border-neutral-100 rounded-xl"
                >
                  <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900 truncate min-w-0">
                    {f.file.name}{" "}
                    <span className="font-normal text-neutral-200">
                      ({formatSize(f.file.size)})
                    </span>
                  </span>

                  {isSaving && f.uploading && f.progress < 100 && (
                    <div className="w-28 h-3 bg-neutral-50 rounded-full overflow-hidden flex-shrink-0 border border-neutral-100">
                      <div
                        className="h-full bg-teal-700 rounded-full transition-all duration-300"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onRemoveFile(sec.key, f.id)}
                    disabled={isSaving}
                    className="w-6 h-6 flex items-center justify-center text-neutral-900 hover:opacity-70 disabled:opacity-40 flex-shrink-0"
                  >
                    <IconX size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
