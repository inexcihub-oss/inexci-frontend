"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccess("Conta criada com sucesso! Faça login para continuar.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Erro ao fazer login. Verifique suas credenciais."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
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

          {/* Title */}
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-black font-urbanist">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="seu@email.com"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {success}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>

            {/* Links */}
            <div className="flex flex-col gap-3 text-center text-sm">
              <div className="text-gray-600">
                Não tem uma conta?{" "}
                <Link
                  href="/cadastro"
                  className="font-semibold text-teal-500 hover:text-teal-600"
                >
                  Criar conta
                </Link>
              </div>
              <div>
                <a
                  href="/forgot-password"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Esqueceu sua senha?
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Modern Design */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '1s' }}></div>

        {/* Content Container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-16">
          <div className="max-w-xl space-y-12 relative z-10">
            {/* Inexci Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-secondary-500 rounded-3xl blur-2xl opacity-30"></div>
              <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-secondary-500 rounded-2xl transform transition-transform hover:scale-110 duration-500"></div>
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

            {/* Quote Section */}
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <svg className="w-12 h-12 text-teal-500 mx-auto opacity-50" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <blockquote className="text-2xl font-light text-white leading-relaxed">
                  A excelência no cuidado começa com a organização perfeita
                </blockquote>
                <div className="flex items-center justify-center gap-3 pt-4">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent via-teal-500 to-transparent"></div>
                  <p className="text-sm text-gray-400 font-medium tracking-wider uppercase">
                    Gestão Inteligente
                  </p>
                  <div className="h-px w-12 bg-gradient-to-r from-transparent via-teal-500 to-transparent"></div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Uptime</div>
              </div>
              <div className="text-center space-y-2 border-x border-white/10">
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Suporte</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-white">100%</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Seguro</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Gradient Line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-secondary-500 to-teal-500"></div>
      </div>
    </div>
  );
}
