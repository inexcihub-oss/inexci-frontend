"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/contexts/AuthContext";

type PageState = "loading" | "success" | "error";

function ConfirmarEmailContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [state, setState] = useState<PageState>("loading");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (typeof window === "undefined") {
      setState("error");
      setErrorMessage("Não foi possível validar o link de confirmação.");
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");

    if (!token) {
      setState("error");
      setErrorMessage(
        "Nenhum token de verificação foi encontrado. O link pode estar incorreto.",
      );
      return;
    }

    authService
      .verifyEmail(token)
      .then((res) => {
        setConfirmedEmail(res.email);
        setState("success");
      })
      .catch((err: unknown) => {
        const msg =
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof (err as { response?: { data?: { message?: string } } })
            .response?.data?.message === "string"
            ? (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            : "Não foi possível confirmar seu e-mail.";
        setErrorMessage(msg ?? "Não foi possível confirmar seu e-mail.");
        setState("error");
      });
  }, []);

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess(false);
    try {
      await authService.resendEmailVerification();
      setResendSuccess(true);
    } catch {
      // silently ignore — user will see toast/feedback elsewhere if needed
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Side — Content */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/brand/logo.png"
              alt="Inexci"
              width={160}
              height={48}
              className="h-12 w-auto"
            />
          </div>

          {/* ── LOADING ── */}
          {state === "loading" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <svg
                  className="animate-spin h-12 w-12 text-teal-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-black font-urbanist">
                Confirmando seu e-mail…
              </h2>
              <p className="text-sm text-gray-500">
                Aguarde um momento enquanto validamos o seu link.
              </p>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {state === "success" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-black font-urbanist">
                  E-mail confirmado!
                </h2>
                {confirmedEmail && (
                  <p className="text-sm text-gray-500">
                    O endereço{" "}
                    <span className="font-medium text-gray-700">
                      {confirmedEmail}
                    </span>{" "}
                    foi verificado com sucesso.
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {/* A confirmação é por token e independe de qualquer sessão
                    ativa no navegador. Sempre encaminha para o login para evitar
                    exibir/assumir o usuário errado (contaminação de sessão). */}
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full text-sm font-semibold min-h-[48px]"
                >
                  Fazer login
                </Button>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {state === "error" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-black font-urbanist">
                  Link inválido ou expirado
                </h2>
                <p className="text-sm text-gray-500">{errorMessage}</p>
              </div>

              {resendSuccess && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 text-sm text-green-700">
                  E-mail de confirmação reenviado! Verifique sua caixa de
                  entrada.
                </div>
              )}

              <div className="space-y-3">
                {/* Botão de reenvio — disponível apenas para usuários autenticados */}
                {user && !user.emailVerified && (
                  <Button
                    onClick={handleResend}
                    isLoading={isResending}
                    className="w-full text-sm font-semibold min-h-[48px]"
                  >
                    Reenviar e-mail de confirmação
                  </Button>
                )}

                <Link
                  href="/login"
                  className="block text-sm font-semibold text-teal-500 hover:text-teal-600"
                >
                  Voltar para o login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side — Decorative */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-16">
          <div className="max-w-xl space-y-12 relative z-10">
            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-secondary-500 rounded-3xl blur-2xl opacity-30" />
              <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-secondary-500 rounded-2xl" />
                    <Image
                      src="/brand/icon.png"
                      alt="Inexci"
                      width={96}
                      height={96}
                      className="relative z-10 w-24 h-24 object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quote */}
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <svg
                  className="w-12 h-12 text-teal-500 mx-auto opacity-50"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <blockquote className="text-2xl font-light text-white leading-relaxed">
                  A excelência no cuidado começa com a organização perfeita
                </blockquote>
                <div className="flex items-center justify-center gap-3 pt-4">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
                  <p className="text-sm text-gray-400 font-medium tracking-wider uppercase">
                    Gestão Inteligente
                  </p>
                  <div className="h-px w-12 bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-secondary-500 to-teal-500" />
      </div>
    </div>
  );
}

export default function ConfirmarEmailPage() {
  return <ConfirmarEmailContent />;
}
