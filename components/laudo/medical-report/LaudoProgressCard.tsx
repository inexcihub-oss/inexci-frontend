export interface LaudoProgressStep {
  key: string;
  label: string;
  complete: boolean;
  optional: boolean;
}

export function LaudoProgressCard({ steps }: { steps: LaudoProgressStep[] }) {
  const requiredSteps = steps.filter((s) => !s.optional);
  const completedCount = requiredSteps.filter((s) => s.complete).length;
  const totalRequired = requiredSteps.length;

  return (
    <div className="flex flex-col gap-3 w-full bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <p className="text-xs md:text-sm font-semibold text-gray-900">
          Progresso do Laudo
        </p>
        <span
          className={`text-xs md:text-sm font-bold ${
            completedCount === totalRequired ? "text-teal-700" : "text-gray-500"
          }`}
        >
          {completedCount}/{totalRequired} obrigatórios concluídos
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-600 rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / totalRequired) * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              step.complete
                ? "bg-teal-50 text-teal-700 border-teal-200"
                : step.optional
                  ? "bg-gray-50 text-gray-400 border-gray-100"
                  : "bg-gray-50 text-gray-500 border-gray-200"
            }`}
          >
            {step.complete ? (
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6L5 9L10 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  step.optional ? "bg-gray-200" : "bg-gray-300"
                }`}
              />
            )}
            {step.label}
            {step.optional && (
              <span className="text-gray-400 font-normal">(opcional)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
