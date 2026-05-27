import { CheckCircle2 } from "lucide-react";

export default function Benefits() {
  const benefits: string[] = [
    "Melhora da reputação: pacientes satisfeitos geram mais indicações e avaliações positivas.",
    "Reduza atritos e cancelamentos por parte dos pacientes.",
    "Aumente a eficiência das solicitações.",
    "Informações cruciais do processo em tempo real.",
    "Redução de cancelamentos: até 68% a menos por falhas de comunicação e gestão.",
    "Otimização de tempo: economize horas semanais em tarefas administrativas.",
    "Segurança e confiabilidade: dados protegidos e acesso seguro de qualquer lugar.",
    "Visão de negócio: relatórios e insights para decisões estratégicas.",
  ];

  const benefitsSplit = benefits.map((s) => {
    const i = s.indexOf(":");
    if (i !== -1) {
      return { title: s.slice(0, i), desc: s.slice(i + 1).trim() };
    }
    return { title: s, desc: "" };
  });

  return (
    <section
      id="beneficios"
      className="relative isolate overflow-hidden py-16 cv-auto mobile-text-bump"
    >
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Benefícios que você terá
          </h2>
          <p className="mt-4 text-[17px] sm:text-base md:text-lg text-gray-600 dark:text-gray-300">
            Resultados práticos no seu dia a dia, com menos atrito, mais
            eficiência e previsibilidade para a sua operação.
          </p>
        </div>

        <div className="relative mx-auto mt-3 max-w-3xl lg:max-w-5xl text-left">
          <div
            aria-hidden
            className="pointer-events-none absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-sky-400/50 via-teal-400/40 to-transparent"
          />
          <ul aria-label="Benefícios" className="space-y-3">
            {benefitsSplit.map((b, idx) => (
              <li key={idx} className="relative group pl-12">
                <span className="absolute left-1.5 top-2 grid place-items-center">
                  <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-teal-400 text-white shadow ring-2 ring-white/40">
                    <CheckCircle2 aria-hidden className="size-4" />
                    <span
                      aria-hidden
                      className="absolute inset-0 -z-10 rounded-full opacity-30 blur-md bg-[conic-gradient(at_50%_50%,#38bdf8_0deg,#2dd4bf_120deg,transparent_330deg)]"
                    />
                  </span>
                </span>
                <div className="rounded-xl border border-white/10 bg-white/50 px-4 py-3 ring-1 ring-sky-400/10 transition backdrop-blur supports-[backdrop-filter]:bg-white/40 group-hover:ring-teal-400/30 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[17px] sm:text-base md:text-lg text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {b.title}
                    </span>
                    {b.desc ? ": " : ""}
                    {b.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
