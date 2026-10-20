"use client";

import type React from "react";
import { useCallback, useRef, useState } from "react";
import { documentService, DOCUMENT_FOLDERS } from "@/services/document.service";
import { useToast } from "@/hooks/useToast";
import {
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_MB,
} from "@/lib/file-upload";
import type { UploadItem } from "./medical-report-utils";

export const REPORT_IMAGES_KEY = "report_images";

interface UseMedicalReportImagesParams {
  surgeryRequestId: string | number;
  onUpdate: () => void;
}

export function useMedicalReportImages({
  surgeryRequestId,
  onUpdate,
}: UseMedicalReportImagesParams) {
  const { showToast } = useToast();
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDeletingDocId, setIsDeletingDocId] = useState<string | null>(null);
  const [imageUploadItems, setImageUploadItems] = useState<UploadItem[]>([]);

  const resetInput = () => {
    if (imagesInputRef.current) imagesInputRef.current.value = "";
  };

  const handleUploadImages = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const allFiles = Array.from(e.target.files ?? []);
      if (!allFiles.length) return;

      const allowed = /\.(jpe?g|png)$/i;
      const files = allFiles.filter((f) => allowed.test(f.name));
      const rejected = allFiles.length - files.length;
      if (rejected > 0) {
        showToast(
          `${rejected} arquivo(s) ignorado(s): apenas JPG e PNG são aceitos`,
          "error",
        );
      }
      if (!files.length) {
        resetInput();
        return;
      }
      const validFiles = files.filter(
        (f) => f.size <= MAX_DOCUMENT_FILE_SIZE_BYTES,
      );
      const oversized = files.filter(
        (f) => f.size > MAX_DOCUMENT_FILE_SIZE_BYTES,
      );
      if (oversized.length > 0) {
        showToast(
          `${oversized.length} arquivo(s) ignorado(s): cada arquivo deve ter no máximo ${MAX_DOCUMENT_FILE_SIZE_MB}MB`,
          "error",
        );
      }
      if (!validFiles.length) {
        resetInput();
        return;
      }
      setIsUploadingImages(true);
      const initialItems: UploadItem[] = validFiles.map((f) => ({
        id: `img-${Date.now()}-${f.name}`,
        name: f.name,
        size: f.size,
        progress: 0,
      }));
      setImageUploadItems(initialItems);
      try {
        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          const itemId = initialItems[i].id;
          await documentService.upload({
            surgeryRequestId,
            key: REPORT_IMAGES_KEY,
            name: file.name.replace(/\.[^.]+$/, ""),
            file,
            folder: DOCUMENT_FOLDERS.REPORT,
            onUploadProgress: (pct) =>
              setImageUploadItems((prev) =>
                prev.map((it) =>
                  it.id === itemId ? { ...it, progress: pct } : it,
                ),
              ),
          });
          setImageUploadItems((prev) =>
            prev.map((it) =>
              it.id === itemId ? { ...it, progress: 100 } : it,
            ),
          );
        }
        showToast(
          files.length > 1 ? "Arquivos enviados" : "Arquivo enviado",
          "success",
        );
        onUpdate();
      } catch {
        showToast("Erro ao enviar arquivos", "error");
      } finally {
        setIsUploadingImages(false);
        setImageUploadItems([]);
        resetInput();
      }
    },
    [surgeryRequestId, onUpdate, showToast],
  );

  const handleDeleteDocument = useCallback(
    async (docId: string, key: string) => {
      setIsDeletingDocId(docId);
      try {
        await documentService.delete({
          id: docId,
          key,
          surgeryRequestId,
        });
        showToast("Arquivo removido", "success");
        onUpdate();
      } catch {
        showToast("Erro ao remover arquivo", "error");
      } finally {
        setIsDeletingDocId(null);
      }
    },
    [surgeryRequestId, onUpdate, showToast],
  );

  return {
    imagesInputRef,
    isUploadingImages,
    imageUploadItems,
    isDeletingDocId,
    handleUploadImages,
    handleDeleteDocument,
  };
}
