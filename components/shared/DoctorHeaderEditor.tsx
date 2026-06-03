"use client";

import { ReactNode, RefObject } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { DoctorHeader } from "@/types/doctor-header.types";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { LayoutTemplate, Loader2, Upload, X } from "lucide-react";

type HeaderLogoPosition = "left" | "center" | "right";

interface DoctorHeaderEditorProps {
  loading: boolean;
  saving: boolean;
  currentHeader: DoctorHeader | null;
  logoPreview: string | null;
  logoPosition: HeaderLogoPosition;
  contentHtml: string;
  logoInputRef: RefObject<HTMLInputElement>;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteLogo: () => void;
  onLogoPositionChange: (position: HeaderLogoPosition) => void;
  onContentHtmlChange: (html: string) => void;
  onSave: () => void;
  onDeleteHeader: () => void;
  saveLabel?: string;
  secondaryActions?: ReactNode;
  showActions?: boolean;
}

export function DoctorHeaderEditor({
  loading,
  saving,
  currentHeader,
  logoPreview,
  logoPosition,
  contentHtml,
  logoInputRef,
  onLogoChange,
  onDeleteLogo,
  onLogoPositionChange,
  onContentHtmlChange,
  onSave,
  onDeleteHeader,
  saveLabel = "Salvar Alterações",
  secondaryActions,
  showActions = true,
}: DoctorHeaderEditorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Logo do Cabeçalho
          </h3>
          <p className="text-sm text-gray-500">
            Imagem exibida no topo dos documentos (PNG, JPG). Máximo 2MB.
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex items-center gap-6">
            <div className="w-32 h-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="max-h-14 max-w-28 object-contain"
                />
              ) : (
                <LayoutTemplate className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Fazer upload
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={onDeleteLogo}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remover logo
                  </Button>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={onLogoChange}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Posição da Logo
          </h3>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onLogoPositionChange("left")}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all",
                logoPosition === "left"
                  ? "bg-primary-50 border-primary-500 text-primary-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300",
              )}
            >
              ← Esquerda
            </button>
            <button
              type="button"
              onClick={() => onLogoPositionChange("center")}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all",
                logoPosition === "center"
                  ? "bg-primary-50 border-primary-500 text-primary-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300",
              )}
            >
              Centro
            </button>
            <button
              type="button"
              onClick={() => onLogoPositionChange("right")}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all",
                logoPosition === "right"
                  ? "bg-primary-50 border-primary-500 text-primary-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300",
              )}
            >
              Direita →
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Texto do Cabeçalho
          </h3>
          <p className="text-sm text-gray-500">
            Nome da clínica, endereço, telefone, especialidade, registros, etc.
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <RichTextEditor
            value={contentHtml}
            onChange={onContentHtmlChange}
            placeholder="Digite o texto do cabeçalho..."
          />
        </CardContent>
      </Card>

      {(logoPreview || contentHtml) && (
        <Card className="border border-gray-200 rounded-2xl">
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Pré-visualização
            </h3>
            <p className="text-sm text-gray-500">
              Como o cabeçalho aparecerá nos documentos
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex flex-col gap-2">
              {logoPreview && (
                <div
                  className={cn(
                    "flex",
                    logoPosition === "right"
                      ? "justify-end"
                      : logoPosition === "center"
                        ? "justify-center"
                        : "justify-start",
                  )}
                >
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="max-h-20 max-w-48 object-contain flex-shrink-0"
                  />
                </div>
              )}
              {contentHtml && (
                <div
                  className="text-xs text-gray-700 leading-relaxed text-center"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(contentHtml),
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showActions && (
        <div className="flex gap-3 flex-wrap">
          {secondaryActions}
          <Button
            type="button"
            onClick={onSave}
            isLoading={saving}
            className="min-h-[44px] rounded-xl"
          >
            {saveLabel}
          </Button>
          {currentHeader && (
            <Button
              type="button"
              variant="outline"
              onClick={onDeleteHeader}
              isLoading={saving}
              className="min-h-[44px] rounded-xl text-red-600 border-red-200 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Remover cabeçalho
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
