"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import Button from "@/components/ui/Button";
import {
  ClinicalSnippetFields,
  validarCamposSnippet,
  type SnippetCampos,
} from "@/components/clinical/ClinicalSnippetFields";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/http-error";
import { clinicalSnippetKeys } from "@/lib/query-keys";
import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  clinicalSnippetService,
  normalizarAtalho,
} from "@/services/clinical-snippet.service";

export function SalvarTextoRapidoModal({
  conteudo,
  doctorId,
  onClose,
}: {
  conteudo: string | null;
  doctorId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const [campos, setCampos] = useState<SnippetCampos>({
    shortcut: "",
    title: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (conteudo === null) return;
    setCampos({ shortcut: "", title: "" });
    setErro(null);
  }, [conteudo]);

  const salvar = async () => {
    if (conteudo === null) return;
    const invalido = validarCamposSnippet(campos);
    if (invalido) {
      setErro(invalido);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const criado = await clinicalSnippetService.create({
        shortcut: normalizarAtalho(campos.shortcut),
        title: campos.title.trim(),
        content: conteudo,
        doctorId,
      });
      await queryClient.invalidateQueries({
        queryKey: clinicalSnippetKeys.all,
      });
      showSuccess(`Texto rápido /${criado.shortcut} salvo.`);
      onClose();
    } catch (err) {
      setErro(getApiErrorMessage(err, "Não foi possível salvar o texto."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen={conteudo !== null}
      onClose={onClose}
      title="Salvar como texto rápido"
      disableClose={salvando}
      footer={
        <ModalFooter align="end">
          <Button variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <SpinnerButton
            onClick={salvar}
            isLoading={salvando}
            loadingText="Salvando..."
          >
            Salvar texto rápido
          </SpinnerButton>
        </ModalFooter>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-4 md:px-6">
        <ClinicalSnippetFields
          campos={campos}
          onChange={setCampos}
          idPrefix="salvar-texto-rapido"
        />
        <div className="flex flex-col gap-1.5">
          <span className="ds-label">Texto</span>
          <div
            className="rte-content rte-clinical max-h-48 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm leading-relaxed text-neutral-800"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(conteudo ?? "") }}
          />
        </div>
        {erro && (
          <p role="alert" className="text-sm text-red-600">
            {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}
