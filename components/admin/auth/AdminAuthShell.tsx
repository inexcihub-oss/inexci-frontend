import Image from "next/image";
import { KeyRound, ShieldCheck, Lock } from "lucide-react";

const PILARES = [
  { icon: ShieldCheck, label: "Dois fatores" },
  { icon: KeyRound, label: "Sessão própria" },
  { icon: Lock, label: "Auditado" },
];

export function AdminAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="flex items-center justify-center gap-2.5">
            <Image
              src="/brand/logo.png"
              alt="Inexci"
              width={160}
              height={48}
              className="h-12 w-auto"
              priority
            />
            <span className="rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary-700">
              Admin
            </span>
          </div>
          {children}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 lg:block lg:w-1/2">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-teal-500 opacity-20 mix-blend-multiply blur-3xl filter" />

        <div className="absolute inset-0 flex flex-col items-center justify-center p-16">
          <div className="relative z-10 max-w-md space-y-10 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-secondary-500">
              <Image
                src="/brand/icon.png"
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 object-contain drop-shadow-2xl"
              />
            </div>
            <div className="space-y-3">
              <p className="text-2xl font-light leading-relaxed text-white">
                Painel administrativo da equipe Inexci
              </p>
              <p className="text-sm text-gray-400">
                Acesso restrito. Cada ação fica registrada no histórico.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 pt-4">
              {PILARES.map(({ icon: Icon, label }, index) => (
                <div
                  key={label}
                  className={
                    index === 1
                      ? "space-y-3 border-x border-white/10"
                      : "space-y-3"
                  }
                >
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <Icon className="h-5 w-5 text-teal-400" aria-hidden />
                  </div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-secondary-500 to-teal-500" />
      </div>
    </div>
  );
}

export function AuthAlert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const classes = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-green-200 bg-green-50 text-green-700",
    info: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border p-3.5 text-sm ${classes}`}
    >
      {children}
    </div>
  );
}
