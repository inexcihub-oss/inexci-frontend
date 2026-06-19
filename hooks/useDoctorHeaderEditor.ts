import { useEffect, useRef, useState } from "react";
import { uploadService } from "@/services/upload.service";
import { doctorHeaderService } from "@/services/doctor-header.service";
import { DoctorHeader } from "@/types/doctor-header.types";
import { ToastType } from "@/types/toast.types";

type HeaderLogoPosition = "left" | "center" | "right";

type Mode = "self" | "byUserId";

interface UseDoctorHeaderEditorOptions {
  enabled: boolean;
  mode?: Mode;
  targetUserId?: string;
  showToast: (message: string, type: ToastType) => void;
  formatError?: (error: unknown, fallback: string) => string;
}

interface SaveHeaderOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  throwOnError?: boolean;
}

export function useDoctorHeaderEditor({
  enabled,
  mode = "self",
  targetUserId,
  showToast,
  formatError,
}: UseDoctorHeaderEditorOptions) {
  const [loadingHeader, setLoadingHeader] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [currentHeader, setCurrentHeader] = useState<DoctorHeader | null>(null);
  const [headerLogoPreview, setHeaderLogoPreview] = useState<string | null>(
    null,
  );
  const [headerLogoFile, setHeaderLogoFile] = useState<File | null>(null);
  const [headerLogoDeleted, setHeaderLogoDeleted] = useState(false);
  const [headerLogoPosition, setHeaderLogoPosition] =
    useState<HeaderLogoPosition>("left");
  const [headerContentHtml, setHeaderContentHtml] = useState<string>("");
  const headerLogoInputRef = useRef<HTMLInputElement>(null);

  const resetHeaderState = () => {
    setCurrentHeader(null);
    setHeaderLogoPreview(null);
    setHeaderLogoFile(null);
    setHeaderLogoDeleted(false);
    setHeaderLogoPosition("left");
    setHeaderContentHtml("");
    if (headerLogoInputRef.current) {
      headerLogoInputRef.current.value = "";
    }
  };

  const resolveHeaderGet = async () => {
    if (mode === "byUserId") {
      if (!targetUserId) return null;
      return doctorHeaderService.getByUserId(targetUserId);
    }
    return doctorHeaderService.get();
  };

  const resolveHeaderUpsert = async (
    data: Pick<DoctorHeader, "logoUrl" | "logoPosition" | "contentHtml">,
  ) => {
    if (mode === "byUserId") {
      if (!targetUserId) throw new Error("targetUserId ausente");
      return doctorHeaderService.upsertByUserId(targetUserId, data);
    }
    return doctorHeaderService.upsert(data);
  };

  const resolveHeaderDelete = async () => {
    if (mode === "byUserId") {
      if (!targetUserId) throw new Error("targetUserId ausente");
      return doctorHeaderService.removeByUserId(targetUserId);
    }
    return doctorHeaderService.remove();
  };

  const loadHeader = async () => {
    if (!enabled) {
      resetHeaderState();
      return;
    }

    if (mode === "byUserId" && !targetUserId) {
      resetHeaderState();
      return;
    }

    setLoadingHeader(true);
    try {
      const header = await resolveHeaderGet();
      setCurrentHeader(header);

      if (!header) {
        resetHeaderState();
        return;
      }

      setHeaderLogoPosition(header.logoPosition);
      setHeaderContentHtml(header.contentHtml || "");
      setHeaderLogoFile(null);
      setHeaderLogoDeleted(false);

      if (header.logoUrl) {
        const logoUrl = header.logoUrl;
        if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
          setHeaderLogoPreview(logoUrl);
        } else {
          try {
            const signed = await uploadService.getSignedUrl(logoUrl);
            setHeaderLogoPreview(signed);
          } catch {
            setHeaderLogoPreview(null);
          }
        }
      } else {
        setHeaderLogoPreview(null);
      }
    } catch {
      resetHeaderState();
    } finally {
      setLoadingHeader(false);
    }
  };

  const handleHeaderLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("A logo deve ter no máximo 2MB", "error");
      return;
    }

    setHeaderLogoFile(file);
    setHeaderLogoDeleted(false);

    const reader = new FileReader();
    reader.onloadend = () => setHeaderLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDeleteHeaderLogo = () => {
    setHeaderLogoFile(null);
    setHeaderLogoPreview(null);
    setHeaderLogoDeleted(true);
    if (headerLogoInputRef.current) headerLogoInputRef.current.value = "";
  };

  const saveHeader = async ({
    showSuccessToast = true,
    showErrorToast = true,
    throwOnError = false,
  }: SaveHeaderOptions = {}) => {
    if (mode === "byUserId" && !targetUserId) return;

    setSavingHeader(true);
    try {
      let logoPath: string | null = currentHeader?.logoUrl ?? null;

      if (headerLogoFile) {
        const result = await uploadService.uploadSingle(
          headerLogoFile,
          "headers",
        );
        logoPath = result.data.path;
      } else if (headerLogoDeleted) {
        logoPath = null;
      }

      const saved = await resolveHeaderUpsert({
        logoUrl: logoPath,
        logoPosition: headerLogoPosition,
        contentHtml: headerContentHtml || null,
      });

      setCurrentHeader(saved);
      setHeaderLogoDeleted(false);
      setHeaderLogoFile(null);
      if (showSuccessToast) {
        showToast("Cabeçalho salvo com sucesso!", "success");
      }
    } catch (error) {
      const fallback = "Erro ao salvar cabeçalho";
      if (showErrorToast) {
        showToast(
          formatError ? formatError(error, fallback) : fallback,
          "error",
        );
      }
      if (throwOnError) {
        throw error;
      }
    } finally {
      setSavingHeader(false);
    }
  };

  const handleSaveHeader = async () => {
    await saveHeader();
  };

  const handleDeleteHeader = async () => {
    if (mode === "byUserId" && !targetUserId) return;

    setSavingHeader(true);
    try {
      await resolveHeaderDelete();
      resetHeaderState();
      showToast("Cabeçalho removido com sucesso!", "success");
    } catch (error) {
      const fallback = "Erro ao remover cabeçalho";
      showToast(formatError ? formatError(error, fallback) : fallback, "error");
    } finally {
      setSavingHeader(false);
    }
  };

  useEffect(() => {
    void loadHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mode, targetUserId]);

  return {
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
    saveHeader,
    handleDeleteHeader,
    resetHeaderState,
    reloadHeader: loadHeader,
  };
}
