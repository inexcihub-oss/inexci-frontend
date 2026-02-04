"use client";

import { useState, useRef } from "react";
import { Upload, X, File, Loader2 } from "lucide-react";
import { uploadService } from "@/services/upload.service";
import { useToast } from "@/hooks/useToast";

interface FileUploadProps {
  onUploadComplete?: (files: Array<{ url: string; path: string; originalName: string }>) => void;
  maxFiles?: number;
  acceptedFileTypes?: string;
  folder?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export function FileUpload({
  onUploadComplete,
  maxFiles = 10,
  acceptedFileTypes = "*",
  folder = "documents",
  multiple = true,
  disabled = false,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ url: string; path: string; originalName: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    // Validar número máximo de arquivos
    if (selectedFiles.length + files.length > maxFiles) {
      showToast(`Você pode enviar no máximo ${maxFiles} arquivo(s)`, "error");
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      showToast("Selecione pelo menos um arquivo", "error");
      return;
    }

    setUploading(true);

    try {
      let result;

      if (selectedFiles.length === 1) {
        // Upload único
        const response = await uploadService.uploadSingle(selectedFiles[0], folder);
        result = [
          {
            url: response.data.url,
            path: response.data.path,
            originalName: selectedFiles[0].name,
          },
        ];
      } else {
        // Upload múltiplo
        const response = await uploadService.uploadMultiple(selectedFiles, folder);
        result = response.data;
      }

      setUploadedFiles(result);
      showToast(`${result.length} arquivo(s) enviado(s) com sucesso!`, "success");

      // Callback com os arquivos enviados
      if (onUploadComplete) {
        onUploadComplete(result);
      }

      // Limpar seleção
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Erro ao fazer upload";
      showToast(errorMessage, "error");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="w-full space-y-4">
      {/* Área de seleção de arquivos */}
      <div className="border-2 border-dashed border-neutral-200 rounded-lg p-6 hover:border-neutral-300 transition-colors">
        <div className="flex flex-col items-center justify-center space-y-3">
          <Upload className="h-10 w-10 text-neutral-400" />
          <div className="text-center">
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-sm font-semibold text-teal-600 hover:text-teal-700"
            >
              Clique para selecionar arquivo(s)
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                className="sr-only"
                onChange={handleFileSelect}
                accept={acceptedFileTypes}
                multiple={multiple}
                disabled={disabled || uploading}
              />
            </label>
            <p className="text-xs text-neutral-500 mt-1">
              ou arraste e solte aqui
            </p>
          </div>
          <p className="text-xs text-neutral-400">
            Máximo de {maxFiles} arquivo(s)
          </p>
        </div>
      </div>

      {/* Lista de arquivos selecionados */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-black">
            Arquivos selecionados ({selectedFiles.length})
          </h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <File className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                  className="p-1 hover:bg-neutral-200 rounded transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4 text-neutral-500" />
                </button>
              </div>
            ))}
          </div>

          {/* Botão de upload */}
          <button
            onClick={handleUpload}
            disabled={uploading || disabled}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Enviar {selectedFiles.length} arquivo(s)
              </>
            )}
          </button>
        </div>
      )}

      {/* Lista de arquivos enviados */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-green-600">
            Arquivos enviados com sucesso
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <File className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">
                      {file.originalName}
                    </p>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline truncate block"
                    >
                      Ver arquivo
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
