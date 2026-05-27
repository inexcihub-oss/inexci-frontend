"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Card, CardContent } from "@/components/landing/ui/card";
import {
  Activity,
  BarChart2,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  RefreshCcw,
  Users,
  Workflow,
} from "lucide-react";

export default function Features() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    });
    return () => {
      emblaApi?.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);
  return (
    <section
      id="solucoes"
      className="relative isolate overflow-hidden pt-16 pb-6 lg:py-16 md:py-16 cv-auto mobile-text-bump"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0) 95%)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0) 95%)",
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.zinc.200/.55)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.zinc.200/.55)_1px,transparent_1px)] bg-[size:36px_36px] opacity-70 dark:bg-[linear-gradient(to_right,theme(colors.zinc.700/.4)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.zinc.700/.4)_1px,transparent_1px)] dark:opacity-50" />
      </div>

      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Tudo que você precisa, em um só lugar
          </h2>
          <p className="mt-4 text-[17px] sm:text-base md:text-lg text-gray-600 dark:text-gray-300">
            Plataforma pensada para centralizar, automatizar e dar visibilidade
            às suas solicitações cirúrgicas.
          </p>
        </div>
        <div className="lg:hidden relative">
          <div
            aria-hidden
            className="hidden pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/90 to-transparent dark:from-zinc-900/90"
          />
          <div
            aria-hidden
            className="hidden pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/90 to-transparent dark:from-zinc-900/90"
          />

          <div
            role="region"
            aria-label="Recursos da plataforma"
            className="-mx-6 px-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex snap-x snap-mandatory gap-3 pr-3">
              <div className="snap-start shrink-0 w-[92%]">
                <Card className="relative content-center h-[16rem] flex overflow-hidden bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
                  <CardContent className="relative m-auto size-fit pt-6">
                    <div className="relative flex h-24 w-56 items-center">
                      <svg
                        className="absolute inset-0 size-full"
                        viewBox="0 0 254 104"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M112.891 97.7022C140.366 97.0802 171.004 94.6715 201.087 87.5116C210.43 85.2881 219.615 82.6412 228.284 78.2473C232.198 76.3179 235.905 73.9942 239.348 71.3124C241.85 69.2557 243.954 66.7571 245.555 63.9408C249.34 57.3235 248.281 50.5341 242.498 45.6109C239.033 42.7237 235.228 40.2703 231.169 38.3054C219.443 32.7209 207.141 28.4382 194.482 25.534C184.013 23.1927 173.358 21.7755 162.64 21.2989C161.376 21.3512 160.113 21.181 158.908 20.796C158.034 20.399 156.857 19.1682 156.962 18.4535C157.115 17.8927 157.381 17.3689 157.743 16.9139C158.104 16.4588 158.555 16.0821 159.067 15.8066C160.14 15.4683 161.274 15.3733 162.389 15.5286C179.805 15.3566 196.626 18.8373 212.998 24.462C220.978 27.2494 228.798 30.4747 236.423 34.1232C240.476 36.1159 244.202 38.7131 247.474 41.8258C254.342 48.2578 255.745 56.9397 251.841 65.4892C249.793 69.8582 246.736 73.6777 242.921 76.6327C236.224 82.0192 228.522 85.4602 220.502 88.2924C205.017 93.7847 188.964 96.9081 172.738 99.2109C153.442 101.949 133.993 103.478 114.506 103.79C91.1468 104.161 67.9334 102.97 45.1169 97.5831C36.0094 95.5616 27.2626 92.1655 19.1771 87.5116C13.839 84.5746 9.1557 80.5802 5.41318 75.7725C-0.54238 67.7259 -1.13794 59.1763 3.25594 50.2827C5.82447 45.3918 9.29572 41.0315 13.4863 37.4319C24.2989 27.5721 37.0438 20.9681 50.5431 15.7272C68.1451 8.8849 86.4883 5.1395 105.175 2.83669C129.045 0.0992292 153.151 0.134761 177.013 2.94256C197.672 5.23215 218.04 9.01724 237.588 16.3889C240.089 17.3418 242.498 18.5197 244.933 19.6446C246.627 20.4387 247.725 21.6695 246.997 23.615C246.455 25.1105 244.814 25.5605 242.63 24.5811C230.322 18.9961 217.233 16.1904 204.117 13.4376C188.761 10.3438 173.2 8.36665 157.558 7.52174C129.914 5.70776 102.154 8.06792 75.2124 14.5228C60.6177 17.8788 46.5758 23.2977 33.5102 30.6161C26.6595 34.3329 20.4123 39.0673 14.9818 44.658C12.9433 46.8071 11.1336 49.1622 9.58207 51.6855C4.87056 59.5336 5.61172 67.2494 11.9246 73.7608C15.2064 77.0494 18.8775 79.925 22.8564 82.3236C31.6176 87.7101 41.3848 90.5291 51.3902 92.5804C70.6068 96.5773 90.0219 97.7419 112.891 97.7022Z"
                          fill="var(--brand)"
                        />
                      </svg>
                      <span className="font-heading mx-auto block w-fit text-3xl font-semibold text-[#1E1F25] dark:text-[#F9FAFB]">
                        100%
                      </span>
                    </div>
                    <h3 className="font-heading mt-6 text-center text-2xl font-semibold text-[#1E1F25] dark:text-[#F9FAFB]">
                      Confiável
                    </h3>
                  </CardContent>
                </Card>
              </div>

              <div className="snap-start shrink-0 w-[92%]">
                <Card className="relative content-center h-[16rem] overflow-hidden bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
                  <CardContent className="pt-6">
                    <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                      <Layers
                        className="m-auto size-10 text-[var(--brand)]"
                        strokeWidth={1}
                      />
                    </div>
                    <div className="relative z-10 mt-6 space-y-2 text-center">
                      <h3 className="font-heading text-base font-semibold text-[#1E1F25] transition dark:text-[#F9FAFB]">
                        Tudo em um só lugar
                      </h3>
                      <p className="font-body text-sm text-foreground/90">
                        Acompanhe todas as solicitações de cirurgias de forma
                        centralizada, sem perder informações importantes
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="snap-start shrink-0 w-[92%]">
                <Card className="relative content-center h-[16rem] overflow-hidden bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
                  <CardContent className="pt-6">
                    <div className="pt-6 flex items-center justify-center">
                      <Activity className="m-auto size-10 text-[var(--brand)]" />
                    </div>
                    <div className="relative z-10 mt-6 space-y-2 text-center">
                      <h3 className="font-heading text-base font-semibold text-[#1E1F25] transition dark:text-[#F9FAFB]">
                        Status em tempo real
                      </h3>
                      <p className="font-body text-sm text-foreground/90">
                        Receba atualizações automáticas sobre cada solicitação,
                        garantindo que nada fique parado
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="snap-start shrink-0 w-[92%]">
                <Card className="relative content-center h-[16rem] overflow-hidden bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
                  <CardContent className="pt-6">
                    <div className="relative z-10 flex flex-col justify-between space-y-10">
                      <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                        <Bell
                          className="m-auto size-10 text-[var(--brand)]"
                          strokeWidth={1}
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="font-heading text-base font-semibold text-zinc-900 transition group-hover:text-secondary-950 dark:text-[#F9FAFB]">
                          Alertas que fazem sentido
                        </h3>
                        <p className="font-body text-sm text-foreground/90">
                          Nunca perca um prazo ou atualização importante, com
                          notificações contextuais e automáticas
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="snap-start shrink-0 w-[92%]">
                <Card className="relative content-center h-[16rem] overflow-hidden bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
                  <CardContent className="pt-6">
                    <div className="relative z-10 flex flex-col justify-between space-y-10">
                      <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                        <FileText
                          className="m-auto size-10 text-[var(--brand)]"
                          strokeWidth={1}
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="font-heading text-base font-semibold transition text-[#1E1F25] dark:text-[#F9FAFB]">
                          Arquivos sempre à mão
                        </h3>
                        <p className="font-body text-sm text-foreground/90">
                          Todos os documentos anexados à solicitação, acessíveis
                          rapidamente em um só lugar
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="snap-start shrink-0 w-[92%]">
                <Card className="relative content-center h-[16rem] overflow-hidden bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
                  <CardContent className="pt-6">
                    <div className="relative z-10 flex flex-col justify-between space-y-10">
                      <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                        <BarChart2
                          className="m-auto size-10 text-[var(--brand)]"
                          strokeWidth={1}
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="font-heading text-base font-semibold text-zinc-900 transition group-hover:text-secondary-950 dark:text-[#F9FAFB]">
                          Insights para decisões
                        </h3>
                        <p className="font-body text-sm text-foreground/90">
                          Tenha uma visão completa do seu negócio com relatórios
                          detalhados e fáceis de interpretar
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="snap-start shrink-0 w-[92%]">
                <Card className="relative content-center h-[16rem] overflow-hidden bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
                  <CardContent className="pt-6">
                    <div className="relative z-10 flex flex-col justify-between space-y-10">
                      <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                        <Users
                          className="m-auto size-10 text-[var(--brand)]"
                          strokeWidth={1}
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="font-heading text-base font-semibold transition text-[#1E1F25] dark:text-[#F9FAFB]">
                          Equipe alinhada
                        </h3>
                        <p className="font-body text-sm text-foreground/90">
                          Todos os envolvidos recebem informações automáticas,
                          garantindo comunicação eficiente e colaboração
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="snap-start shrink-0 w-[92%]">
                <Card className="relative content-center h-[16rem] overflow-hidden bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
                  <CardContent className="pt-6">
                    <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                      <RefreshCcw className="m-auto size-10 text-[var(--brand)]" />
                    </div>
                    <div className="relative z-10 mt-6 space-y-2 text-center">
                      <h3 className="font-heading text-base font-semibold text-[#1E1F25] transition dark:text-[#F9FAFB]">
                        Follow-up automático
                      </h3>
                      <p className="font-body text-sm text-foreground/90">
                        O sistema sugere próximas ações e mantém cada
                        solicitação atualizada sem esforço manual
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="snap-start shrink-0 w-[92%]">
                <Card className="relative content-center h-[16rem] flex overflow-hidden bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
                  <CardContent className="relative m-auto size-fit pt-6">
                    <div className="relative flex h-24 w-56 items-center">
                      <svg
                        className="absolute inset-0 size-full"
                        viewBox="0 0 254 104"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M112.891 97.7022C140.366 97.0802 171.004 94.6715 201.087 87.5116C210.43 85.2881 219.615 82.6412 228.284 78.2473C232.198 76.3179 235.905 73.9942 239.348 71.3124C241.85 69.2557 243.954 66.7571 245.555 63.9408C249.34 57.3235 248.281 50.5341 242.498 45.6109C239.033 42.7237 235.228 40.2703 231.169 38.3054C219.443 32.7209 207.141 28.4382 194.482 25.534C184.013 23.1927 173.358 21.7755 162.64 21.2989C161.376 21.3512 160.113 21.181 158.908 20.796C158.034 20.399 156.857 19.1682 156.962 18.4535C157.115 17.8927 157.381 17.3689 157.743 16.9139C158.104 16.4588 158.555 16.0821 159.067 15.8066C160.14 15.4683 161.274 15.3733 162.389 15.5286C179.805 15.3566 196.626 18.8373 212.998 24.462C220.978 27.2494 228.798 30.4747 236.423 34.1232C240.476 36.1159 244.202 38.7131 247.474 41.8258C254.342 48.2578 255.745 56.9397 251.841 65.4892C249.793 69.8582 246.736 73.6777 242.921 76.6327C236.224 82.0192 228.522 85.4602 220.502 88.2924C205.017 93.7847 188.964 96.9081 172.738 99.2109C153.442 101.949 133.993 103.478 114.506 103.79C91.1468 104.161 67.9334 102.97 45.1169 97.5831C36.0094 95.5616 27.2626 92.1655 19.1771 87.5116C13.839 84.5746 9.1557 80.5802 5.41318 75.7725C-0.54238 67.7259 -1.13794 59.1763 3.25594 50.2827C5.82447 45.3918 9.29572 41.0315 13.4863 37.4319C24.2989 27.5721 37.0438 20.9681 50.5431 15.7272C68.1451 8.8849 86.4883 5.1395 105.175 2.83669C129.045 0.0992292 153.151 0.134761 177.013 2.94256C197.672 5.23215 218.04 9.01724 237.588 16.3889C240.089 17.3418 242.498 18.5197 244.933 19.6446C246.627 20.4387 247.725 21.6695 246.997 23.615C246.455 25.1105 244.814 25.5605 242.63 24.5811C230.322 18.9961 217.233 16.1904 204.117 13.4376C188.761 10.3438 173.2 8.36665 157.558 7.52174C129.914 5.70776 102.154 8.06792 75.2124 14.5228C60.6177 17.8788 46.5758 23.2977 33.5102 30.6161C26.6595 34.3329 20.4123 39.0673 14.9818 44.658C12.9433 46.8071 11.1336 49.1622 9.58207 51.6855C4.87056 59.5336 5.61172 67.2494 11.9246 73.7608C15.2064 77.0494 18.8775 79.925 22.8564 82.3236C31.6176 87.7101 41.3848 90.5291 51.3902 92.5804C70.6068 96.5773 90.0219 97.7419 112.891 97.7022Z"
                          fill="var(--brand)"
                        />
                      </svg>
                      <span className="font-heading mx-auto block w-fit text-3xl font-semibold text-[#1E1F25] dark:text-[#F9FAFB]">
                        100%
                      </span>
                    </div>
                    <h3 className="font-heading mt-6 text-center text-2xl font-semibold text-[#1E1F25] dark:text-[#F9FAFB]">
                      Seguro
                    </h3>
                  </CardContent>
                </Card>
              </div>

              <div className="snap-start shrink-0 w-[92%]">
                <Card className="relative content-center h-[16rem] overflow-hidden bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
                  <CardContent className="pt-6">
                    <div className="pt-6 flex items-center justify-center">
                      <Workflow
                        className="m-auto size-10 text-[var(--brand)]"
                        strokeWidth={1}
                      />
                    </div>
                    <div className="relative z-10 mt-6 space-y-2 text-center">
                      <h3 className="font-heading text-base font-semibold text-[#1E1F25] transition dark:text-[#F9FAFB]">
                        Fluxo inteligente de solicitações
                      </h3>
                      <p className="font-body text-sm text-foreground/90">
                        Workflow automatizado garante que cada etapa da
                        solicitação seja cumprida de forma clara e eficiente
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-base sm:text-xs text-zinc-600 dark:text-zinc-300">
            Arraste para ver mais →
          </p>
        </div>

        <div className="relative hidden lg:block">
          <button
            type="button"
            onClick={scrollPrev}
            className="hidden lg:inline-flex absolute -left-14 top-1/2 z-20 -translate-y-1/2 transform h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/70 text-zinc-700 shadow-sm backdrop-blur hover:bg-[var(--brand)] hover:text-white hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
            aria-label="Slide anterior"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="hidden lg:inline-flex absolute -right-14 top-1/2 z-20 -translate-y-1/2 transform h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/70 text-zinc-700 shadow-sm backdrop-blur hover:bg-[var(--brand)] hover:text-white hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
            aria-label="Próximo slide"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>

          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              <div className="min-w-0 px-1 flex-[0_0_100%]">
                <div className="relative z-10 grid grid-cols-6 gap-3">
                  <Card className="relative content-center lg:h-[18rem] md:h-[18rem] col-span-full flex overflow-hidden lg:col-span-2 bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] group liquid-card">
                    <CardContent className="relative m-auto size-fit pt-6">
                      <div className="relative flex h-24 w-56 items-center">
                        <svg
                          className="absolute inset-0 size-full"
                          viewBox="0 0 254 104"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M112.891 97.7022C140.366 97.0802 171.004 94.6715 201.087 87.5116C210.43 85.2881 219.615 82.6412 228.284 78.2473C232.198 76.3179 235.905 73.9942 239.348 71.3124C241.85 69.2557 243.954 66.7571 245.555 63.9408C249.34 57.3235 248.281 50.5341 242.498 45.6109C239.033 42.7237 235.228 40.2703 231.169 38.3054C219.443 32.7209 207.141 28.4382 194.482 25.534C184.013 23.1927 173.358 21.7755 162.64 21.2989C161.376 21.3512 160.113 21.181 158.908 20.796C158.034 20.399 156.857 19.1682 156.962 18.4535C157.115 17.8927 157.381 17.3689 157.743 16.9139C158.104 16.4588 158.555 16.0821 159.067 15.8066C160.14 15.4683 161.274 15.3733 162.389 15.5286C179.805 15.3566 196.626 18.8373 212.998 24.462C220.978 27.2494 228.798 30.4747 236.423 34.1232C240.476 36.1159 244.202 38.7131 247.474 41.8258C254.342 48.2578 255.745 56.9397 251.841 65.4892C249.793 69.8582 246.736 73.6777 242.921 76.6327C236.224 82.0192 228.522 85.4602 220.502 88.2924C205.017 93.7847 188.964 96.9081 172.738 99.2109C153.442 101.949 133.993 103.478 114.506 103.79C91.1468 104.161 67.9334 102.97 45.1169 97.5831C36.0094 95.5616 27.2626 92.1655 19.1771 87.5116C13.839 84.5746 9.1557 80.5802 5.41318 75.7725C-0.54238 67.7259 -1.13794 59.1763 3.25594 50.2827C5.82447 45.3918 9.29572 41.0315 13.4863 37.4319C24.2989 27.5721 37.0438 20.9681 50.5431 15.7272C68.1451 8.8849 86.4883 5.1395 105.175 2.83669C129.045 0.0992292 153.151 0.134761 177.013 2.94256C197.672 5.23215 218.04 9.01724 237.588 16.3889C240.089 17.3418 242.498 18.5197 244.933 19.6446C246.627 20.4387 247.725 21.6695 246.997 23.615C246.455 25.1105 244.814 25.5605 242.63 24.5811C230.322 18.9961 217.233 16.1904 204.117 13.4376C188.761 10.3438 173.2 8.36665 157.558 7.52174C129.914 5.70776 102.154 8.06792 75.2124 14.5228C60.6177 17.8788 46.5758 23.2977 33.5102 30.6161C26.6595 34.3329 20.4123 39.0673 14.9818 44.658C12.9433 46.8071 11.1336 49.1622 9.58207 51.6855C4.87056 59.5336 5.61172 67.2494 11.9246 73.7608C15.2064 77.0494 18.8775 79.925 22.8564 82.3236C31.6176 87.7101 41.3848 90.5291 51.3902 92.5804C70.6068 96.5773 90.0219 97.7419 112.891 97.7022Z"
                            fill="var(--brand)"
                          />
                        </svg>
                        <span className="font-heading mx-auto block w-fit text-3xl font-semibold text-[#1E1F25] dark:text-[#F9FAFB]">
                          100%
                        </span>
                      </div>
                      <h3 className="font-heading mt-6 text-center text-2xl font-semibold text-[#1E1F25] dark:text-[#F9FAFB]">
                        Confiável
                      </h3>
                    </CardContent>
                  </Card>
                  <Card className="relative content-center lg:h-[18rem] md:h-[18rem] col-span-full overflow-hidden sm:col-span-3 md:col-span-2 lg:col-span-2 bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] group liquid-card">
                    <CardContent className="pt-6">
                      <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                        <Layers
                          className="m-auto size-10 text-[var(--brand)]"
                          strokeWidth={1}
                        />
                      </div>
                      <div className="relative z-10 mt-6 space-y-2 text-center">
                        <h3 className="font-heading text-base font-semibold text-[#1E1F25] transition dark:text-[#F9FAFB]">
                          Tudo em um só lugar
                        </h3>
                        <p className="font-body text-sm text-foreground/90">
                          Acompanhe todas as solicitações de cirurgias de forma
                          centralizada, sem perder informações importantes
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="relative content-center lg:h-[18rem] md:h-[18rem] col-span-full overflow-hidden sm:col-span-3 lg:col-span-2 bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] group liquid-card">
                    <CardContent className=" pt-6">
                      <div className="pt-6 lg:px-6 flex items-center justify-center">
                        <Activity className="m-auto size-10 text-[var(--brand)]" />
                      </div>
                      <div className="relative z-10 mt-6 space-y-2 text-center">
                        <h3 className="font-heading text-base font-semibold text-[#1E1F25] transition dark:text-[#F9FAFB]">
                          Status em tempo real
                        </h3>
                        <p className="font-body text-sm text-foreground/90">
                          Receba atualizações automáticas sobre cada
                          solicitação, garantindo que nada fique parado
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="card content-center lg:h-[15rem] md:h-[15rem] variant-outlined relative col-span-full overflow-hidden lg:col-span-3 bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] group liquid-card">
                    <CardContent className="pt-6">
                      <div className="relative z-10 flex flex-col justify-between space-y-12 lg:space-y-6">
                        <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                          <Bell
                            className="m-auto size-10 text-[var(--brand)]"
                            strokeWidth={1}
                          />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="font-heading text-base font-semibold text-zinc-900 transition group-hover:text-secondary-950 dark:text-[#F9FAFB]">
                            Alertas que fazem sentido
                          </h3>
                          <p className="font-body text-sm text-foreground/90">
                            Nunca perca um prazo ou atualização importante, com
                            notificações contextuais e automáticas
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="card content-center lg:h-[15rem] md:h-[15rem] variant-outlined relative col-span-full overflow-hidden lg:col-span-3 bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] group liquid-card">
                    <CardContent className="pt-6">
                      <div className="relative z-10 flex flex-col justify-between space-y-12 lg:space-y-6">
                        <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                          <FileText
                            className="m-auto size-10 text-[var(--brand)]"
                            strokeWidth={1}
                          />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="font-heading text-base font-semibold transition text-[#1E1F25] dark:text-[#F9FAFB]">
                            Arquivos sempre à mão
                          </h3>
                          <p className="font-body text-sm text-foreground/90">
                            Todos os documentos anexados à solicitação,
                            acessíveis rapidamente em um só lugar
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="min-w-0 px-1 flex-[0_0_100%]">
                <div className="relative z-10 grid grid-cols-6 gap-3">
                  <Card className="card content-center lg:h-[15rem] md:h-[15rem] variant-outlined relative col-span-full overflow-hidden lg:col-span-3 bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] group liquid-card">
                    <CardContent className="pt-6">
                      <div className="relative z-10 flex flex-col justify-between space-y-12 lg:space-y-6">
                        <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                          <BarChart2
                            className="m-auto size-10 text-[var(--brand)]"
                            strokeWidth={1}
                          />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="font-heading text-base font-semibold text-zinc-900 transition group-hover:text-secondary-950 dark:text-[#F9FAFB]">
                            Insights para decisões
                          </h3>
                          <p className="font-body text-sm text-foreground/90">
                            Tenha uma visão completa do seu negócio com
                            relatórios detalhados e fáceis de interpretar
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="card content-center lg:h-[15rem] md:h-[15rem] variant-outlined relative col-span-full overflow-hidden lg:col-span-3 bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] group liquid-card">
                    <CardContent className="pt-6">
                      <div className="relative z-10 flex flex-col justify-between space-y-12 lg:space-y-6">
                        <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                          <Users
                            className="m-auto size-10 text-[var(--brand)]"
                            strokeWidth={1}
                          />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="font-heading text-base font-semibold transition text-[#1E1F25] dark:text-[#F9FAFB]">
                            Equipe alinhada
                          </h3>
                          <p className="font-body text-sm text-foreground/90">
                            Todos os envolvidos recebem informações automáticas,
                            garantindo comunicação eficiente e colaboração
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="relative content-center lg:h-[18rem] md:h-[18rem] col-span-full overflow-hidden sm:col-span-3 lg:col-span-2 bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] group liquid-card">
                    <CardContent className="pt-6">
                      <div className="relative mx-auto flex aspect-square size-16 rounded-full border border-[var(--brand)] before:absolute before:-inset-2 before:rounded-full before:border before:border-[color:var(--brand)] items-center justify-center">
                        <RefreshCcw className="m-auto size-10 text-[var(--brand)]" />
                      </div>
                      <div className="relative z-10 mt-6 space-y-2 text-center">
                        <h3 className="font-heading text-base font-semibold text-[#1E1F25] transition dark:text-[#F9FAFB]">
                          Follow-up automático
                        </h3>
                        <p className="font-body text-sm text-foreground/90">
                          O sistema sugere próximas ações e mantém cada
                          solicitação atualizada sem esforço manual
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="relative content-center lg:h-[18rem] md:h-[18rem] col-span-full flex overflow-hidden lg:col-span-2 bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] group liquid-card">
                    <CardContent className="relative m-auto size-fit pt-6">
                      <div className="relative flex h-24 w-56 items-center">
                        <svg
                          className="absolute inset-0 size-full"
                          viewBox="0 0 254 104"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M112.891 97.7022C140.366 97.0802 171.004 94.6715 201.087 87.5116C210.43 85.2881 219.615 82.6412 228.284 78.2473C232.198 76.3179 235.905 73.9942 239.348 71.3124C241.85 69.2557 243.954 66.7571 245.555 63.9408C249.34 57.3235 248.281 50.5341 242.498 45.6109C239.033 42.7237 235.228 40.2703 231.169 38.3054C219.443 32.7209 207.141 28.4382 194.482 25.534C184.013 23.1927 173.358 21.7755 162.64 21.2989C161.376 21.3512 160.113 21.181 158.908 20.796C158.034 20.399 156.857 19.1682 156.962 18.4535C157.115 17.8927 157.381 17.3689 157.743 16.9139C158.104 16.4588 158.555 16.0821 159.067 15.8066C160.14 15.4683 161.274 15.3733 162.389 15.5286C179.805 15.3566 196.626 18.8373 212.998 24.462C220.978 27.2494 228.798 30.4747 236.423 34.1232C240.476 36.1159 244.202 38.7131 247.474 41.8258C254.342 48.2578 255.745 56.9397 251.841 65.4892C249.793 69.8582 246.736 73.6777 242.921 76.6327C236.224 82.0192 228.522 85.4602 220.502 88.2924C205.017 93.7847 188.964 96.9081 172.738 99.2109C153.442 101.949 133.993 103.478 114.506 103.79C91.1468 104.161 67.9334 102.97 45.1169 97.5831C36.0094 95.5616 27.2626 92.1655 19.1771 87.5116C13.839 84.5746 9.1557 80.5802 5.41318 75.7725C-0.54238 67.7259 -1.13794 59.1763 3.25594 50.2827C5.82447 45.3918 9.29572 41.0315 13.4863 37.4319C24.2989 27.5721 37.0438 20.9681 50.5431 15.7272C68.1451 8.8849 86.4883 5.1395 105.175 2.83669C129.045 0.0992292 153.151 0.134761 177.013 2.94256C197.672 5.23215 218.04 9.01724 237.588 16.3889C240.089 17.3418 242.498 18.5197 244.933 19.6446C246.627 20.4387 247.725 21.6695 246.997 23.615C246.455 25.1105 244.814 25.5605 242.63 24.5811C230.322 18.9961 217.233 16.1904 204.117 13.4376C188.761 10.3438 173.2 8.36665 157.558 7.52174C129.914 5.70776 102.154 8.06792 75.2124 14.5228C60.6177 17.8788 46.5758 23.2977 33.5102 30.6161C26.6595 34.3329 20.4123 39.0673 14.9818 44.658C12.9433 46.8071 11.1336 49.1622 9.58207 51.6855C4.87056 59.5336 5.61172 67.2494 11.9246 73.7608C15.2064 77.0494 18.8775 79.925 22.8564 82.3236C31.6176 87.7101 41.3848 90.5291 51.3902 92.5804C70.6068 96.5773 90.0219 97.7419 112.891 97.7022Z"
                            fill="var(--brand)"
                          />
                        </svg>
                        <span className="font-heading mx-auto block w-fit text-3xl font-semibold text-[#1E1F25] dark:text-[#F9FAFB]">
                          100%
                        </span>
                      </div>
                      <h3 className="font-heading mt-6 text-center text-2xl font-semibold text-[#1E1F25] dark:text-[#F9FAFB]">
                        Seguro
                      </h3>
                    </CardContent>
                  </Card>
                  <Card className="relative content-center lg:h-[18rem] md:h-[18rem] col-span-full overflow-hidden sm:col-span-3 lg:col-span-2 bg-zinc-50/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/70 border border-zinc-200 dark:border-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] group liquid-card">
                    <CardContent className="pt-6">
                      <div className="pt-6 lg:px-6 flex items-center justify-center">
                        <Workflow
                          className="m-auto size-10 text-[var(--brand)]"
                          strokeWidth={1}
                        />
                      </div>
                      <div className="relative z-10 mt-6 space-y-2 text-center">
                        <h3 className="font-heading text-base font-semibold text-[#1E1F25] transition dark:text-[#F9FAFB]">
                          Fluxo inteligente de solicitações
                        </h3>
                        <p className="font-body text-sm text-foreground/90">
                          Workflow automatizado garante que cada etapa da
                          solicitação seja cumprida de forma clara e eficiente
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 hidden lg:flex items-center justify-center gap-2">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => scrollTo(index)}
                aria-current={selectedIndex === index}
                className={
                  "h-2.5 w-2.5 rounded-full border border-black/10 transition dark:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] " +
                  (selectedIndex === index
                    ? "bg-[var(--brand)] ring-2 ring-[var(--brand)]"
                    : "bg-white/70 hover:bg-white/90 dark:bg-white/10")
                }
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
