"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SurgeryRequestDetail } from "@/services/surgery-request.service";
import { doctorHeaderService } from "@/services/doctor-header.service";
import { userService } from "@/services/user.service";
import { uploadService } from "@/services/upload.service";
import { useToast } from "@/hooks/useToast";
import { removeBackground } from "@/lib/utils";
import type { DoctorHeader } from "@/types/doctor-header.types";
import type { User } from "@/types";

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

interface UseMedicalReportSignatureParams {
  solicitacao: SurgeryRequestDetail | null | undefined;
  currentUser: User | null;
  onUpdate: () => void;
}

export function useMedicalReportSignature({
  solicitacao,
  currentUser,
  onUpdate,
}: UseMedicalReportSignatureParams) {
  const { showToast } = useToast();
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [doctorHeader, setDoctorHeader] = useState<
    DoctorHeader | null | undefined
  >(undefined);
  const signatureRefetchAttempted = useRef(false);

  useEffect(() => {
    const doctor = solicitacao?.doctor;
    const dp = doctor?.doctorProfile;
    let url: string | null =
      doctor?.signatureUrl ?? dp?.signatureUrl ?? null;

    if (
      !url &&
      currentUser &&
      doctor?.id === currentUser.id &&
      currentUser.doctorProfile?.signatureUrl
    ) {
      url = currentUser.doctorProfile.signatureUrl;
    }

    setSignatureUrl(url);
  }, [solicitacao, currentUser]);

  useEffect(() => {
    if (signatureRefetchAttempted.current) return;
    const doctor = solicitacao?.doctor;
    if (!doctor || !currentUser || doctor.id !== currentUser.id) return;

    const scSignature =
      doctor.signatureUrl ?? doctor.doctorProfile?.signatureUrl;
    const profileSignature = currentUser.doctorProfile?.signatureUrl;

    if (!scSignature && profileSignature) {
      signatureRefetchAttempted.current = true;
      onUpdate();
    }
  }, [solicitacao, currentUser, onUpdate]);

  useEffect(() => {
    if (!currentUser) return;
    const isOwnRequest =
      !solicitacao?.doctor || solicitacao.doctor.id === currentUser.id;
    if (!isOwnRequest) {
      setDoctorHeader(null);
      return;
    }
    doctorHeaderService
      .get()
      .then(setDoctorHeader)
      .catch(() => setDoctorHeader(null));
  }, [currentUser, solicitacao?.doctor]);

  const doctorId = solicitacao?.doctor?.id;

  const handleSignatureUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !doctorId) return;

      if (file.size > MAX_SIGNATURE_BYTES) {
        showToast("A assinatura deve ter no máximo 2MB", "error");
        return;
      }

      setIsUploadingSignature(true);
      try {
        const processed = await removeBackground(file);
        const { data } = await uploadService.uploadSingle(
          processed,
          "signatures",
        );
        await userService.updateDoctorProfile(String(doctorId), {
          signatureImageUrl: data.path,
        });
        showToast("Assinatura adicionada com sucesso!", "success");
        onUpdate();
      } catch {
        showToast("Erro ao adicionar assinatura.", "error");
      } finally {
        setIsUploadingSignature(false);
      }
    },
    [doctorId, onUpdate, showToast],
  );

  const handleSignatureDelete = useCallback(async () => {
    if (!doctorId) return;

    setIsUploadingSignature(true);
    try {
      await userService.updateDoctorProfile(String(doctorId), {
        signatureImageUrl: null,
      });
      showToast("Assinatura removida.", "success");
      onUpdate();
    } catch {
      showToast("Erro ao remover assinatura.", "error");
    } finally {
      setIsUploadingSignature(false);
    }
  }, [doctorId, onUpdate, showToast]);

  const isOtherDoctor = !!(
    solicitacao?.doctor &&
    currentUser &&
    solicitacao.doctor.id !== currentUser.id
  );
  const isOwnDoctor = !!(
    solicitacao?.doctor &&
    currentUser &&
    solicitacao.doctor.id === currentUser.id
  );

  return {
    signatureUrl,
    isUploadingSignature,
    handleSignatureUpload,
    handleSignatureDelete,
    doctorHeader,
    isOtherDoctor,
    isOwnDoctor,
    doctorName: solicitacao?.doctor?.name,
  };
}
