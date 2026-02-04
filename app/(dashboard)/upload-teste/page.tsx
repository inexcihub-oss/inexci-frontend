"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui";

export default function UploadTestePage() {
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ url: string; path: string; originalName: string }>
  >([]);

  const handleUploadComplete = (
    files: Array<{ url: string; path: string; originalName: string }>
  ) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">
            Teste de Upload de Arquivos
          </h1>
          <p className="text-neutral-600 mt-2">
            Teste o sistema de upload de arquivos para o Supabase Storage
          </p>
        </div>

        {/* Componente de Upload */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-xl font-semibold text-black mb-4">
            Upload de Documentos
          </h2>
          <FileUpload
            onUploadComplete={handleUploadComplete}
            maxFiles={5}
            folder="documents"
            multiple={true}
            acceptedFileTypes="image/*,application/pdf,.doc,.docx"
          />
        </div>

        {/* Histórico de uploads */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-xl font-semibold text-black mb-4">
              Histórico de Uploads ({uploadedFiles.length})
            </h2>
            <div className="space-y-3">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-neutral-500 truncate mt-1">
                      {file.path}
                    </p>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded hover:bg-teal-700 transition-colors"
                  >
                    Abrir
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            ℹ️ Informações
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Tipos aceitos: Imagens, PDF, DOC, DOCX</li>
            <li>• Máximo de 5 arquivos por vez</li>
            <li>• Arquivos são salvos na pasta "documents" do Supabase</li>
            <li>• URLs públicas são geradas automaticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
