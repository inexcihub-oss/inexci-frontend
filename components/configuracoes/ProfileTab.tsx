"use client";

import Image from "next/image";
import { Camera, FileSignature, Loader2, Upload, User, X } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import Select from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { GENDER_OPTIONS, STATE_UF_OPTIONS } from "@/lib/options";
import {
  COUNCIL_OPTIONS,
  ProfessionalCouncil,
} from "@/lib/professional-council";
import { TabLoading } from "./SettingsControls";
import type { ProfileSettings } from "./useProfileSettings";

interface ProfileTabProps {
  settings: ProfileSettings;
  isAccountOwner: boolean;
}

export function ProfileTab({ settings, isAccountOwner }: ProfileTabProps) {
  const {
    loadingProfile,
    saving,
    profile,
    setProfile,
    profileErrors,
    updateProfileField,
    avatarPreview,
    avatarInputRef,
    handleAvatarChange,
    removeAvatar,
    signaturePreview,
    signatureFile,
    signatureDeleted,
    isProcessingSignature,
    signatureInputRef,
    handleSignatureChange,
    handleDeleteSignature,
    handleSaveProfile,
  } = settings;

  if (loadingProfile) return <TabLoading />;

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Foto do Perfil
          </h3>
          <p className="text-sm text-gray-500">
            Esta foto será exibida em seu perfil e nas comunicações
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-primary-600 rounded-full text-white hover:bg-primary-700 transition-colors shadow-lg"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Fazer upload
              </Button>
              {avatarPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={removeAvatar}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              )}
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG ou GIF. Máximo 5MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Dados Pessoais
          </h3>
          <p className="text-sm text-gray-500">
            Informações básicas do seu perfil
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome completo"
              value={profile.name}
              onChange={(e) => updateProfileField("name", e.target.value)}
              required
              error={profileErrors.name}
            />
            <Input
              label="E-mail"
              type="email"
              value={profile.email}
              onChange={(e) => updateProfileField("email", e.target.value)}
              required
              error={profileErrors.email}
            />
            <Input
              label="Telefone"
              mask="phone"
              value={profile.phone}
              onChange={(e) => updateProfileField("phone", e.target.value)}
              placeholder="(00) 00000-0000"
              error={profileErrors.phone}
            />
            <Input
              label="CPF"
              mask="cpf"
              value={profile.document}
              onChange={(e) => updateProfileField("document", e.target.value)}
              placeholder="000.000.000-00"
              error={profileErrors.document}
            />
            <DateInput
              label="Data de nascimento"
              value={profile.birthDate}
              onChange={(v) => setProfile({ ...profile, birthDate: v })}
            />
            <Select
              label="Gênero"
              value={profile.gender}
              onChange={(e) =>
                setProfile({ ...profile, gender: e.target.value })
              }
              options={GENDER_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      {profile.isDoctor && (
        <Card className="border border-gray-200 rounded-2xl">
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Dados Profissionais
            </h3>
            <p className="text-sm text-gray-500">
              Informações do registro profissional
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {isAccountOwner ? (
                <Select
                  label="Conselho"
                  value={profile.council ?? "CRM"}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      council: e.target.value as ProfessionalCouncil,
                    })
                  }
                  options={COUNCIL_OPTIONS}
                />
              ) : (
                <Input
                  label="Conselho"
                  value={
                    COUNCIL_OPTIONS.find(
                      (opt) => opt.value === (profile.council ?? "CRM"),
                    )?.label ?? "CRM"
                  }
                  disabled
                  readOnly
                  title="Para trocar o conselho, fale com a administração da conta."
                />
              )}
              <Input
                label="Especialidade"
                value={profile.specialty || ""}
                onChange={(e) =>
                  setProfile({ ...profile, specialty: e.target.value })
                }
                placeholder="Ex: Ortopedia"
              />
              <Input
                label="Número no conselho"
                value={profile.crm || ""}
                onChange={(e) =>
                  setProfile({ ...profile, crm: e.target.value })
                }
                placeholder="00000"
              />
              <Select
                label="UF do conselho"
                value={profile.crmState || ""}
                onChange={(e) =>
                  setProfile({ ...profile, crmState: e.target.value })
                }
                options={STATE_UF_OPTIONS}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {profile.isDoctor && (
        <Card
          data-tour="config-assinatura"
          className="border border-gray-200 rounded-2xl"
        >
          <CardHeader className="p-6 pb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              Assinatura Digital
            </h3>
            <p className="text-sm text-gray-500">
              Faça upload da sua assinatura para documentos e laudos
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {isProcessingSignature ? (
              <div className="flex items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                <p className="text-sm text-gray-500">
                  Processando assinatura...
                </p>
              </div>
            ) : (
              <div
                onClick={() =>
                  !isProcessingSignature && signatureInputRef.current?.click()
                }
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                  signaturePreview
                    ? "border-primary-300 bg-primary-50"
                    : "border-gray-300 hover:border-primary-400 hover:bg-gray-50",
                )}
              >
                {signaturePreview ? (
                  <div className="relative">
                    <Image
                      src={signaturePreview}
                      alt="Assinatura"
                      width={300}
                      height={100}
                      className="mx-auto object-contain"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSignature();
                      }}
                      className="absolute top-0 right-0 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      Clique para fazer upload da assinatura
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG ou JPG. O fundo será removido automaticamente.
                      Máximo 2MB.
                    </p>
                  </>
                )}
              </div>
            )}
            {(signatureFile || signatureDeleted) && !isProcessingSignature && (
              <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <span>⚠</span>{" "}
                {signatureDeleted
                  ? 'Remoção pendente — clique em "Salvar Alterações" para confirmar.'
                  : 'Assinatura ainda não salva — clique em "Salvar Alterações" para confirmar.'}
              </p>
            )}
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleSignatureChange}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <Button
          onClick={handleSaveProfile}
          isLoading={saving}
          className="min-h-[44px] rounded-xl"
        >
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
