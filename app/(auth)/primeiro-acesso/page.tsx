"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui";
import PasswordInput from "@/components/ui/PasswordInput";
import { authService } from "@/services/auth.service";
import { ShieldCheck, CheckCircle2, Lock, UserPlus, Bell } from "lucide-react";

function PrimeiroAcessoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!email || !token) {
      setError(
        "Link inválido ou expirado. Solicite um novo convite ao administrador.",
      );
    }
  }, [email, token]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const valid = await authService.validateRecoveryCode(email, token);
      if (!valid) {
        setError(
          "Link inválido ou expirado. Solicite um novo convite ao administrador.",
        );
        return;
      }

      await authService.changePassword(email, token, password);

      setSuccess(true);
      setTimeout(() => router.push("/login?registered=true"), 2500);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (
              err as {
                response?: { data?: { message?: string } };
              }
            ).response?.data?.message
          : undefined;
      setError(
        msg ??
          "Ocorreu um erro ao definir sua senha. O link pode ter expirado.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Side - Form */}
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
              priority
            />
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold text-black font-urbanist">
              Crie sua senha
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Defina uma senha segura para ativar sua conta na plataforma
            </p>
            {email && (
              <div className="mt-3 inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-4 py-1.5">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-sm font-medium text-teal-700">
                  {email}
                </span>
              </div>
            )}
          </div>

          {/* Success State */}
          {success ? (
            <div className="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100">
                <CheckCircle2 className="w-8 h-8 text-teal-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-teal-800">
                  Conta ativada com sucesso!
                </p>
                <p className="text-sm text-teal-600 mt-1">
                  Redirecionando para o login…
                </p>
              </div>
              <div className="flex justify-center">
                <div className="h-1 w-24 bg-teal-200 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full animate-[progress_2.5s_ease-in-out]" />
                </div>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Security hint */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <p className="text-xs text-slate-500">
                  Sua senha deve ter no mínimo 8 caracteres. Recomendamos usar
                  letras, números e caracteres especiais.
                </p>
              </div>

              <PasswordInput
                id="password"
                name="password"
                label="Nova senha"
                autoComplete="new-password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                placeholder="Mínimo 8 caracteres"
                showStrength
                className="min-h-[48px]"
                disabled={!email || !token}
              />

              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                label="Confirmar senha"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Digite a senha novamente"
                error={mismatch ? "As senhas não coincidem" : undefined}
                className={`min-h-[48px] ${
                  mismatch
                    ? "border-red-300 bg-red-50"
                    : confirmPassword && confirmPassword === password
                      ? "border-teal-300"
                      : ""
                }`}
                disabled={!email || !token}
              />

              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full text-sm font-semibold min-h-[48px]"
                disabled={isLoading || !email || !token}
              >
                Ativar conta
              </Button>

              {/* Link to login */}
              <div className="text-center text-sm text-gray-600">
                Já tem acesso?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-teal-500 hover:text-teal-600"
                >
                  Fazer login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right Side - Modern Design (matching login page) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* Content Container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-16">
          <div className="max-w-xl space-y-12 relative z-10">
            {/* Inexci Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-secondary-500 rounded-3xl blur-2xl opacity-30" />
              <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-secondary-500 rounded-2xl transform transition-transform hover:scale-110 duration-500" />
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

            {/* Welcome Message */}
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
                  Você foi convidado a fazer parte da gestão cirúrgica mais
                  inteligente do mercado
                </blockquote>
                <div className="flex items-center justify-center gap-3 pt-4">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
                  <p className="text-sm text-gray-400 font-medium tracking-wider uppercase">
                    Bem-vindo à Inexci
                  </p>
                  <div className="h-px w-12 bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
                </div>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-3 gap-8 pt-8">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mx-auto">
                  <UserPlus className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  Colaboração
                </div>
              </div>
              <div className="text-center space-y-3 border-x border-white/10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mx-auto">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  Segurança
                </div>
              </div>
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mx-auto">
                  <Bell className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  Tempo Real
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Gradient Line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-secondary-500 to-teal-500" />
      </div>
    </div>
  );
}

export default function PrimeiroAcessoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Carregando...
        </div>
      }
    >
      <PrimeiroAcessoForm />
    </Suspense>
  );
}
