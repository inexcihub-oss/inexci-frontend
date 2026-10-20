"use client";

import { DoctorHeaderEditor } from "@/components/shared/DoctorHeaderEditor";
import { useDoctorHeaderEditor } from "@/hooks/useDoctorHeaderEditor";
import type { ToastType } from "@/types/toast.types";
import { getApiErrorMessage } from "@/lib/http-error";

export function HeaderTab({
  showToast,
}: {
  showToast: (message: string, type?: ToastType) => void;
}) {
  const {
    loadingHeader,
    savingHeader,
    currentHeader,
    headerLogoPreview,
    headerLogoPosition,
    headerContentHtml,
    headerLogoInputRef,
    setHeaderLogoPosition,
    setHeaderContentHtml,
    handleHeaderLogoChange,
    handleDeleteHeaderLogo,
    handleSaveHeader,
    handleDeleteHeader,
  } = useDoctorHeaderEditor({
    enabled: true,
    mode: "self",
    showToast,
    formatError: (error, fallback) => getApiErrorMessage(error, fallback),
  });

  return (
    <DoctorHeaderEditor
      loading={loadingHeader}
      saving={savingHeader}
      currentHeader={currentHeader}
      logoPreview={headerLogoPreview}
      logoPosition={headerLogoPosition}
      contentHtml={headerContentHtml}
      logoInputRef={headerLogoInputRef}
      onLogoChange={handleHeaderLogoChange}
      onDeleteLogo={handleDeleteHeaderLogo}
      onLogoPositionChange={setHeaderLogoPosition}
      onContentHtmlChange={setHeaderContentHtml}
      onSave={handleSaveHeader}
      onDeleteHeader={handleDeleteHeader}
      saveLabel="Salvar Alterações"
    />
  );
}
