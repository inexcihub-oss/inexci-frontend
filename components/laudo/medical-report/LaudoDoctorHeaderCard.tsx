import type { DoctorHeader } from "@/types/doctor-header.types";

interface LaudoDoctorHeaderCardProps {
  doctorHeader: DoctorHeader | null;
  isReadOnly: boolean;
  isOtherDoctor: boolean;
  isOwnDoctor: boolean;
  doctorName?: string;
  onAddHeader: () => void;
}

export function LaudoDoctorHeaderCard({
  doctorHeader,
  isReadOnly,
  isOtherDoctor,
  isOwnDoctor,
  doctorName,
  onAddHeader,
}: LaudoDoctorHeaderCardProps) {
  return (
    <div className="flex flex-col gap-4 w-full bg-white border border-gray-200 rounded-2xl p-4">
      <h3 className="ds-section-title leading-loose">CABEÇALHO DE DOCUMENTOS</h3>
      {doctorHeader ? (
        <div className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-xl">
          <span className="flex-1 text-xs md:text-sm font-semibold text-gray-900 truncate">
            Cabeçalho personalizado
          </span>
          <div className="w-20 sm:w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            <div className="h-full w-full bg-teal-600 rounded-full" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full py-3 px-4 sm:pl-4 sm:pr-2 bg-gray-100 border border-dashed border-gray-200 rounded-xl">
          <p className="text-xs md:text-sm text-gray-500 leading-snug flex-1">
            {isReadOnly
              ? "Nenhum cabeçalho registrado. O documento usará o cabeçalho padrão."
              : isOtherDoctor
                ? `O médico ${doctorName} não possui cabeçalho personalizado. O documento usará o cabeçalho padrão.`
                : "Nenhum cabeçalho configurado. O documento usará o cabeçalho padrão."}
          </p>
          {!isReadOnly && isOwnDoctor && (
            <button
              type="button"
              onClick={onAddHeader}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-xs md:text-sm text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Adicionar cabeçalho
            </button>
          )}
        </div>
      )}
    </div>
  );
}
