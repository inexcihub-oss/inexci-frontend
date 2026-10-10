"use client";

import { useRef, type ChangeEvent } from "react";
import { X } from "lucide-react";

interface EmailAttachmentsProps {
  attachments: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}

export function EmailAttachments({
  attachments,
  onAdd,
  onRemove,
}: EmailAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAdd(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="ds-label mb-0">Anexos</label>
      <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 border border-gray-200">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </div>
          <span className="text-xs md:text-sm font-semibold text-gray-900">
            Anexos
          </span>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 text-xs md:text-sm text-gray-900 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          Selecionar arquivo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          data-testid="send-request-attachments-input"
          onChange={handleFileSelect}
        />
      </div>
      {attachments.map((file, index) => (
        <div
          key={index}
          className="flex items-center justify-between px-4 py-2 rounded-xl border border-gray-200 bg-white"
        >
          <span className="text-xs md:text-sm font-semibold text-gray-900">
            {file.name}{" "}
            <span className="text-gray-400 font-normal">
              ({(file.size / 1024 / 1024).toFixed(1)}MB)
            </span>
          </span>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
