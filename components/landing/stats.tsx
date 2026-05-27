export default function StatsSection() {
  return (
    <section className="py-12 md:py-20 cv-auto mobile-text-bump">
      <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-16">
        <div className="relative z-10 mx-auto max-w-xl lg:max-w-3xl space-y-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            O preço invisível da ineficiência administrativa
          </h2>
          <p className="mt-4 text-[17px] sm:text-base md:text-lg text-gray-600 dark:text-gray-300">
            ineficiência operacional e falha na comunicação impactam o resultado
            de cirurgiões em todo Brasil.
          </p>
        </div>

        <div className="grid gap-12 divide-y *:text-center md:grid-cols-3 md:gap-2 md:divide-x md:divide-y-0">
          <div className="space-y-4 space-x-2">
            <div className="text-5xl mt-2 font-bold text-[var(--brand)]">
              20-30%
            </div>
            <p className="text-[17px] sm:text-base">
              da perda média de receita são por ineficiências administrativas.
            </p>
          </div>
          <div className="space-y-4 space-x-2">
            <div className="text-5xl mt-4 lg:mt-0 md:mt-0 font-bold text-[var(--brand)]">
              68%
            </div>
            <p className="text-[17px] sm:text-base">
              dos cancelamentos são por questões administrativas/comunicação,
              não por questões médicas.
            </p>
          </div>
          <div className="space-y-4 space-x-2">
            <div className="text-5xl mt-4 lg:mt-0 md:mt-0 font-bold text-[var(--brand)]">
              35%
            </div>
            <p className="text-[17px] sm:text-base">
              dos pacientes consideram trocar de médico devido a problemas
              administrativos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
