import { LaudoWarningIcon } from "./LaudoSpinner";

interface LaudoPatientIdentificationProps {
  fields: { label: string; value: string }[];
  patientComplete: boolean;
  isReadOnly: boolean;
  onEdit: () => void;
}

const EDIT_BUTTON_CLASS =
  "flex-shrink-0 flex items-center px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-xl text-xs md:text-sm font-semibold text-black hover:bg-gray-50 transition-colors";

const FIELD_CLASS =
  "ds-input bg-gray-50 text-gray-400 border-gray-100 cursor-default select-none";

export function LaudoPatientIdentification({
  fields,
  patientComplete,
  isReadOnly,
  onEdit,
}: LaudoPatientIdentificationProps) {
  return (
    <div
      id="laudo-patient-identification"
      className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-2xl p-4"
    >
      <div className="flex items-center justify-between w-full gap-4">
        <h3 className="ds-section-title leading-loose">
          IDENTIFICAÇÃO DO PACIENTE
        </h3>
        {!isReadOnly && (
          <button onClick={onEdit} className={EDIT_BUTTON_CLASS}>
            Editar
          </button>
        )}
      </div>

      {!patientComplete && !isReadOnly && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <LaudoWarningIcon />
          Campos obrigatórios incompletos. Clique em
          <strong className="mx-0">Editar</strong> para preencher os dados do
          paciente.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {fields.map((field) => (
          <div key={field.label} className="flex flex-col gap-1">
            <label className="ds-label mb-0">{field.label}</label>
            <div className={FIELD_CLASS}>{field.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
