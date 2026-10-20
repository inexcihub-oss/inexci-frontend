"use client";

import type React from "react";
import { X } from "lucide-react";
import { safeExternalUrl } from "@/lib/safe-url";
import { LaudoImagesInfoTooltip } from "./LaudoImagesInfoTooltip";
import { LaudoSpinner } from "./LaudoSpinner";
import { formatBytes, type UploadItem } from "./medical-report-utils";

interface ExamImage {
  id: string;
  name: string;
  uri: string;
}

interface LaudoImagesCardProps {
  isReadOnly: boolean;
  examImages: ExamImage[];
  uploadItems: UploadItem[];
  isUploading: boolean;
  deletingDocId: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (docId: string) => void;
}

export function LaudoImagesCard({
  isReadOnly,
  examImages,
  uploadItems,
  isUploading,
  deletingDocId,
  inputRef,
  onUpload,
  onDelete,
}: LaudoImagesCardProps) {
  return (
    <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-2xl p-4">
      <h3 className="ds-section-title leading-loose flex items-center gap-1.5">
        IMAGENS A SEREM ANEXADAS AO LAUDO
        <LaudoImagesInfoTooltip />
      </h3>

      {!isReadOnly && (
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={onUpload}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 w-full py-2 pl-4 pr-2 bg-gray-100 border border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors"
          >
            {isUploading ? (
              <LaudoSpinner className="w-8 h-8 text-gray-400" />
            ) : (
              <svg
                className="w-8 h-8 text-gray-400"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10.667 8H7.334C6.228 8 5.334 8.895 5.334 10v16c0 1.105.894 2 2 2h17.333c1.105 0 2-.895 2-2V10c0-1.105-.895-2-2-2h-3.333"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 4v16M12 8l4-4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span className="text-xs md:text-sm text-gray-500 text-center">
              {isUploading
                ? "Enviando..."
                : "Clique para anexar imagens do exame (Raio-X, Ressonâncias, etc)"}
            </span>
          </button>
        </>
      )}

      {(uploadItems.length > 0 || examImages.length > 0) && (
        <div className="flex flex-col gap-2">
          {uploadItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-xl"
            >
              <span className="flex-1 text-xs md:text-sm font-semibold text-gray-900 truncate">
                {item.name}{" "}
                <span className="font-normal text-gray-400">
                  ({formatBytes(item.size)})
                </span>
              </span>
              <div className="w-20 sm:w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <div className="w-6 h-6 flex-shrink-0" />
            </div>
          ))}
          {examImages.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-xl"
            >
              <a
                href={safeExternalUrl(doc.uri)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs md:text-sm font-semibold text-gray-900 truncate hover:text-teal-700 hover:underline transition-colors"
              >
                {doc.name}
              </a>
              <div className="w-20 sm:w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                <div className="h-full w-full bg-teal-600 rounded-full" />
              </div>
              {!isReadOnly && (
                <button
                  onClick={() => onDelete(doc.id)}
                  disabled={deletingDocId === doc.id}
                  className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                >
                  {deletingDocId === doc.id ? (
                    <LaudoSpinner />
                  ) : (
                    <X className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
