"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSolicitacao } from "@/contexts/SolicitacaoContext";
import { SurgeryRequestStatusCode } from "@/lib/surgery-request-status";
import { MedicalReportPreviewModal } from "@/components/laudo/MedicalReportPreviewModal";
import { buildLaudoPatientDisplayFields } from "@/components/laudo/SurgeryRequestLaudoDocument";
import {
  buildPatientData,
  EMPTY_PATIENT_DATA,
  type PatientFormData,
} from "./medical-report/medical-report-utils";
import { useMedicalReportSections } from "./medical-report/useMedicalReportSections";
import { useMedicalReportSignature } from "./medical-report/useMedicalReportSignature";
import {
  REPORT_IMAGES_KEY,
  useMedicalReportImages,
} from "./medical-report/useMedicalReportImages";
import { useMedicalReportPdfExport } from "./medical-report/useMedicalReportPdfExport";
import {
  LaudoProgressCard,
  type LaudoProgressStep,
} from "./medical-report/LaudoProgressCard";
import { LaudoPatientIdentification } from "./medical-report/LaudoPatientIdentification";
import { LaudoSectionsCard } from "./medical-report/LaudoSectionsCard";
import { LaudoImagesCard } from "./medical-report/LaudoImagesCard";
import { LaudoDoctorHeaderCard } from "./medical-report/LaudoDoctorHeaderCard";
import { LaudoSignatureCard } from "./medical-report/LaudoSignatureCard";
import { MedicalReportActions } from "./medical-report/MedicalReportActions";

export function MedicalReportEditor() {
  const { solicitacao, statusNum, onUpdate } = useSolicitacao();
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const isReadOnly = statusNum !== SurgeryRequestStatusCode.PENDING;

  const [patientData, setPatientData] =
    useState<PatientFormData>(EMPTY_PATIENT_DATA);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!solicitacao) return;
    setPatientData(buildPatientData(solicitacao));
  }, [solicitacao]);

  const sectionsState = useMedicalReportSections({
    surgeryRequestId: solicitacao?.id,
    onUpdate,
  });
  const signature = useMedicalReportSignature({
    solicitacao,
    currentUser,
    onUpdate,
  });
  const images = useMedicalReportImages({
    surgeryRequestId: solicitacao?.id,
    onUpdate,
  });
  const { isExportingPdf, handleExportPdf } = useMedicalReportPdfExport(
    solicitacao?.id,
  );

  const { sections } = sectionsState;
  const examImages =
    solicitacao?.documents?.filter((d) => d.key === REPORT_IMAGES_KEY) ?? [];

  const p = solicitacao?.patient;
  const patientComplete = !!(
    p?.name?.trim() && p?.cpf?.replace(/\D/g, "").length === 11
  );

  const patientDisplayFields = buildLaudoPatientDisplayFields({
    patient: p,
    healthPlan: solicitacao?.healthPlan,
    healthPlanName: solicitacao?.healthPlanName,
    healthPlanRegistration: solicitacao?.healthPlanRegistration,
  });

  const progressSteps: LaudoProgressStep[] = [
    {
      key: "identification",
      label: "Identificação",
      complete: patientComplete,
      optional: false,
    },
    {
      key: "sections",
      label: "Seções do Laudo",
      complete: sections.length > 0,
      optional: false,
    },
    {
      key: "images",
      label: "Imagens a serem anexadas ao laudo",
      complete: examImages.length > 0,
      optional: true,
    },
    {
      key: "signed",
      label: "Assinatura do Médico",
      complete: !!signature.signatureUrl,
      optional: false,
    },
  ];

  const canPreview = !!patientData.name.trim() && sections.length > 0;

  return (
    <>
      <div className="flex flex-col gap-3 w-full py-4">
        <LaudoProgressCard steps={progressSteps} />

        <div
          className={`flex flex-col gap-3 w-full ${isReadOnly ? "opacity-70 pointer-events-none" : ""}`}
          style={isReadOnly ? { pointerEvents: "none" } : undefined}
        >
          <LaudoPatientIdentification
            fields={patientDisplayFields}
            patientComplete={patientComplete}
            isReadOnly={isReadOnly}
            onEdit={() =>
              router.push(
                `/pacientes/${solicitacao?.patient?.id}?returnUrl=${encodeURIComponent(`/solicitacao/${solicitacao?.id}?tab=laudo`)}`,
              )
            }
          />

          <LaudoSectionsCard state={sectionsState} isReadOnly={isReadOnly} />

          <LaudoImagesCard
            isReadOnly={isReadOnly}
            examImages={examImages}
            uploadItems={images.imageUploadItems}
            isUploading={images.isUploadingImages}
            deletingDocId={images.isDeletingDocId}
            inputRef={images.imagesInputRef}
            onUpload={images.handleUploadImages}
            onDelete={(docId) =>
              images.handleDeleteDocument(docId, REPORT_IMAGES_KEY)
            }
          />

          {signature.doctorHeader !== undefined && (
            <LaudoDoctorHeaderCard
              doctorHeader={signature.doctorHeader}
              isReadOnly={isReadOnly}
              isOtherDoctor={signature.isOtherDoctor}
              isOwnDoctor={signature.isOwnDoctor}
              doctorName={signature.doctorName}
              onAddHeader={() => router.push("/configuracoes?tab=header")}
            />
          )}

          <LaudoSignatureCard
            signatureUrl={signature.signatureUrl}
            isReadOnly={isReadOnly}
            isUploading={signature.isUploadingSignature}
            isOtherDoctor={signature.isOtherDoctor}
            doctorName={signature.doctorName}
            onUpload={signature.handleSignatureUpload}
            onDelete={signature.handleSignatureDelete}
            onGoToSettings={() => router.push("/configuracoes")}
          />
        </div>

        <hr className="border-gray-200" />

        <MedicalReportActions
          canPreview={canPreview}
          isExporting={isExportingPdf}
          onPreview={() => setShowPreview(true)}
          onExport={handleExportPdf}
        />
      </div>

      <MedicalReportPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        solicitacao={solicitacao}
      />
    </>
  );
}
