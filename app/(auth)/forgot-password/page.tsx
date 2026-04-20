"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import PasswordInput from "@/components/ui/PasswordInput";
import { authService } from "@/services/auth.service";
import { ArrowLeft, CheckCircle2, Mail, KeyRound, Lock } from "lucide-react";

type Step = "email" | "code" | "password" | "success";

function ForgotPasswordForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  /* ── Etapa 1: solicitar código ── */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setStep("code");
    } catch (err: unknown) {
      setError(
        extractMessage(err) ??
          "Não foi possível enviar o código. Verifique o e-mail informado.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Etapa 2: validar código ── */
  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const valid = await authService.validateRecoveryCode(email, code);
      if (!valid) {
        setError("Código inválido ou expirado. Verifique e tente novamente.");
        return;
      }
      setStep("password");
    } catch (err: unknown) {
      setError(extractMessage(err) ?? "Código inválido ou expirado.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Etapa 3: redefinir senha ── */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword(email, code, password);
      setStep("success");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      setError(
        extractMessage(err) ??
          "Não foi possível redefinir a senha. Tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Lado esquerdo: formulário ── */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
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

          {/* ── Tela de sucesso ── */}
          {step === "success" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-teal-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-teal-500" />
                </div>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-black font-urbanist">
                  Senha redefinida!
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Sua senha foi alterada com sucesso. Redirecionando para o
                  login...
                </p>
              </div>
              <Link
                href="/login"
                className="inline-block text-sm font-semibold text-teal-500 hover:text-teal-600"
              >
                Ir para o login agora
              </Link>
            </div>
          )}

          {/* ── Etapas 1, 2, 3 ── */}
          {step !== "success" && (
            <>
              {/* Indicador de etapas */}
              <div className="flex items-center justify-center gap-2">
                {(["email", "code", "password"] as Step[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        step === s
                          ? "bg-teal-500 text-white"
                          : ["email", "code", "password"].indexOf(step) > i
                            ? "bg-teal-100 text-teal-600"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {["email", "code", "password"].indexOf(step) > i ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < 2 && (
                      <div
                        className={`w-10 h-0.5 ${
                          ["email", "code", "password"].indexOf(step) > i
                            ? "bg-teal-400"
                            : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Título por etapa */}
              <div className="text-center">
                {step === "email" && (
                  <>
                    <div className="flex justify-center mb-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
                        <Mail className="w-6 h-6 text-teal-500" />
                      </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-black font-urbanist">
                      Esqueceu sua senha?
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Digite seu e-mail e enviaremos um código de recuperação.
                    </p>
                  </>
                )}
                {step === "code" && (
                  <>
                    <div className="flex justify-center mb-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
                        <KeyRound className="w-6 h-6 text-teal-500" />
                      </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-black font-urbanist">
                      Verifique seu e-mail
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Enviamos um código para{" "}
                      <span className="font-medium text-gray-700">{email}</span>
                      .
                    </p>
                  </>
                )}
                {step === "password" && (
                  <>
                    <div className="flex justify-center mb-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-teal-500" />
                      </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-black font-urbanist">
                      Nova senha
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Escolha uma senha segura com pelo menos 8 caracteres.
                    </p>
                  </>
                )}
              </div>

              {/* ── Formulário: Etapa 1 — E-mail ── */}
              {step === "email" && (
                <form onSubmit={handleSendCode} className="space-y-5">
                  <Input
                    id="email"
                    name="email"
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    placeholder="seu@email.com"
                    className="min-h-[48px]"
                  />

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="w-full text-sm font-semibold min-h-[48px]"
                  >
                    Enviar código
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar para o login
                    </Link>
                  </div>
                </form>
              )}

              {/* ── Formulário: Etapa 2 — Código ── */}
              {step === "code" && (
                <form onSubmit={handleValidateCode} className="space-y-5">
                  <Input
                    id="code"
                    name="code"
                    label="Código de verificação"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                    disabled={isLoading}
                    placeholder="Ex: 123456"
                    className="min-h-[48px] tracking-widest text-center text-lg"
                  />

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="w-full text-sm font-semibold min-h-[48px]"
                  >
                    Verificar código
                  </Button>

                  <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setError("");
                        setCode("");
                      }}
                      className="hover:text-gray-700 underline underline-offset-2"
                    >
                      Reenviar código
                    </button>
                  </div>
                </form>
              )}

              {/* ── Formulário: Etapa 3 — Nova senha ── */}
              {step === "password" && (
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <PasswordInput
                    id="password"
                    name="password"
                    label="Nova senha"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="Mínimo 8 caracteres"
                    className="min-h-[48px]"
                  />

                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirmar senha"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="Repita a nova senha"
                    className={`min-h-[48px] ${mismatch ? "border-red-400" : ""}`}
                  />

                  {mismatch && (
                    <p className="text-xs text-red-500 -mt-2">
                      As senhas não coincidem.
                    </p>
                  )}

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    disabled={mismatch}
                    className="w-full text-sm font-semibold min-h-[48px]"
                  >
                    Redefinir senha
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Lado direito: decorativo (igual ao login) ── */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-16">
          <div className="max-w-xl space-y-12 relative z-10">
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
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-secondary-500 to-teal-500" />
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Carregando...
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}

/* ── helpers ── */
function extractMessage(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "response" in err) {
    return (err as { response?: { data?: { message?: string } } }).response
      ?.data?.message;
  }
  return undefined;
}
