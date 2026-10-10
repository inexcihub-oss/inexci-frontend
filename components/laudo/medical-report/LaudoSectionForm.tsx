import { LaudoRichTextEditor } from "./LaudoRichTextEditor";
import { LaudoSpinner } from "./LaudoSpinner";
import {
  SECTION_TITLE_MAX_LENGTH,
  stripHtmlTags,
  type SectionDraft,
} from "./medical-report-utils";

interface LaudoSectionFormProps {
  draft: SectionDraft;
  onChange: (updater: (draft: SectionDraft) => SectionDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  saveDisabled: boolean;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  saveButtonClassName: string;
}

const LABEL_CLASS =
  "text-xs font-semibold text-gray-500 uppercase tracking-wide";

export function LaudoSectionForm({
  draft,
  onChange,
  onCancel,
  onSave,
  isSaving,
  saveDisabled,
  titleLabel,
  titlePlaceholder,
  descriptionPlaceholder,
  saveButtonClassName,
}: LaudoSectionFormProps) {
  const titleLength = stripHtmlTags(draft.title).length;

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className={LABEL_CLASS}>{titleLabel}</label>
          <span
            className={`text-xs ${
              titleLength >= SECTION_TITLE_MAX_LENGTH
                ? "text-red-500 font-semibold"
                : "text-gray-400"
            }`}
          >
            {titleLength}/{SECTION_TITLE_MAX_LENGTH}
          </span>
        </div>
        <LaudoRichTextEditor
          value={draft.title}
          onChange={(html) => {
            if (stripHtmlTags(html).length <= SECTION_TITLE_MAX_LENGTH) {
              onChange((d) => ({ ...d, title: html }));
            }
          }}
          placeholder={titlePlaceholder}
          minHeight="36px"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={LABEL_CLASS}>Corpo</label>
        <LaudoRichTextEditor
          value={draft.description}
          onChange={(html) => onChange((d) => ({ ...d, description: html }))}
          placeholder={descriptionPlaceholder}
        />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center justify-center h-8 px-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className={saveButtonClassName}
        >
          {isSaving ? (
            <span className="flex items-center gap-1.5">
              <LaudoSpinner className="w-3.5 h-3.5 text-white" />
              Salvando...
            </span>
          ) : (
            "Salvar"
          )}
        </button>
      </div>
    </>
  );
}
