"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { loginSchema } from "@/lib/schemas/auth.schema";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import type { AdminLoginStep } from "@/services/admin-auth.service";
import { AuthAlert } from "./AdminAuthShell";
import {
  TOO_MANY_ATTEMPTS_MESSAGE,
  errorStatus,
  responseMessage,
} from "./admin-auth-errors";

export function AdminCredentialsForm({
  notice,
  onStep,
}: {
  notice: { tone: "success" | "info"; text: string } | null;
  onStep: (step: AdminLoginStep) => void;
}) {
  const { login } = useAdminAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useZodForm({
    schema: loginSchema,
    initialValues: { email: "", password: "" },
  });

  const submit = form.handleSubmit(async ({ email, password }) => {
    setError("");
    setIsLoading(true);
    try {
      const step = await login(email.trim().toLowerCase(), password);
      onStep(step);
    } catch (err: unknown) {
      const status = errorStatus(err);
      setError(
        status === 429
          ? responseMessage(err, TOO_MANY_ATTEMPTS_MESSAGE)
          : status === 401
            ? responseMessage(err, "E-mail ou senha incorretos.")
            : responseMessage(err, "Não foi possível entrar. Tente novamente."),
      );
      form.setField("password", "");
    } finally {
      setIsLoading(false);
    }
  });

  const { name: _emailName, ...emailProps } = form.getFieldProps("email");
  const { name: _passwordName, ...passwordProps } =
    form.getFieldProps("password");

  return (
    <>
      <div className="text-center">
        <h1 className="font-urbanist text-2xl font-semibold text-black sm:text-3xl">
          Painel administrativo
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Acesso exclusivo da equipe Inexci
        </p>
      </div>

      <form
        noValidate
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(event);
        }}
        className="space-y-6"
      >
        <div className="space-y-4">
          <Input
            id="admin-email"
            label="E-mail"
            type="email"
            autoComplete="username"
            required
            {...emailProps}
            disabled={isLoading}
            placeholder="voce@inexci.com.br"
            className="min-h-[48px]"
          />
          <Input
            id="admin-password"
            label="Senha"
            type="password"
            autoComplete="current-password"
            required
            {...passwordProps}
            disabled={isLoading}
            placeholder="••••••••"
            className="min-h-[48px]"
          />
        </div>

        {notice && <AuthAlert tone={notice.tone}>{notice.text}</AuthAlert>}
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <Button
          type="submit"
          isLoading={isLoading}
          className="min-h-[48px] w-full text-sm font-semibold"
        >
          Continuar
        </Button>

        <p className="text-center text-xs text-gray-500">
          Esqueceu a senha ou perdeu o autenticador? Peça a outro administrador
          para redefinir seu acesso.
        </p>
      </form>
    </>
  );
}
