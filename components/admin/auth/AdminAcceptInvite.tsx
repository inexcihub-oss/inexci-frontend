"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import PasswordInput from "@/components/ui/PasswordInput";
import { useZodForm } from "@/hooks/useZodForm";
import { newPasswordSchema } from "@/lib/schemas/auth.schema";
import { clearLinkParams, readLinkParams } from "@/lib/link-params";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-nav";
import { adminAuthService } from "@/services/admin-auth.service";
import { AdminAuthShell, AuthAlert } from "./AdminAuthShell";
import {
  TOO_MANY_ATTEMPTS_MESSAGE,
  errorStatus,
  responseMessage,
} from "./admin-auth-errors";

const INVALID_INVITE_MESSAGE =
  "Convite inválido ou expirado. Peça a outro administrador para reenviar o acesso.";

export function AdminAcceptInvite() {
  const router = useRouter();
  const lido = useRef(false);
  const [link, setLink] = useState({ email: "", token: "", ready: false });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (lido.current) return;
    lido.current = true;
    const params = readLinkParams();
    clearLinkParams(["email", "token"]);
    setLink({
      email: params.get("email") ?? "",
      token: params.get("token") ?? "",
      ready: true,
    });
  }, []);

  const form = useZodForm({
    schema: newPasswordSchema,
    initialValues: { password: "", confirmPassword: "" },
  });

  const valido = Boolean(link.email && link.token);

  const submit = form.handleSubmit(async ({ password }) => {
    setError("");
    setIsLoading(true);
    try {
      await adminAuthService.acceptInvite(link.email, link.token, password);
      router.replace(`${ADMIN_LOGIN_PATH}?convite=aceito`);
    } catch (err: unknown) {
      const status = errorStatus(err);
      setError(
        status === 429
          ? TOO_MANY_ATTEMPTS_MESSAGE
          : status === 401 || status === 404 || status === 410
            ? INVALID_INVITE_MESSAGE
            : responseMessage(
                err,
                "Não foi possível criar sua senha. Tente novamente.",
              ),
      );
    } finally {
      setIsLoading(false);
    }
  });

  if (!link.ready) return null;

  return (
    <AdminAuthShell>
      <div className="text-center">
        <h1 className="font-urbanist text-2xl font-semibold text-black sm:text-3xl">
          {valido ? "Crie sua senha" : "Link inválido"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {valido
            ? "Você foi convidado para o painel administrativo da Inexci"
            : "O convite expirou ou o link está incompleto"}
        </p>
        {valido && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-1.5">
            <span className="text-sm font-medium text-teal-700">
              {link.email}
            </span>
          </div>
        )}
      </div>

      {!valido ? (
        <div className="space-y-5">
          <AuthAlert tone="error">{INVALID_INVITE_MESSAGE}</AuthAlert>
          <Link
            href={ADMIN_LOGIN_PATH}
            className="block w-full rounded-lg bg-teal-500 py-3 text-center font-semibold text-white transition-colors hover:bg-teal-600"
          >
            Ir para o login
          </Link>
        </div>
      ) : (
        <form
          noValidate
          method="post"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(event);
          }}
          className="space-y-5"
        >
          <PasswordInput
            id="admin-new-password"
            label="Nova senha"
            autoComplete="new-password"
            showRequirements
            {...form.getFieldProps("password")}
            placeholder="Mínimo 8 caracteres"
            className="min-h-[48px]"
          />
          <PasswordInput
            id="admin-confirm-password"
            label="Confirmar senha"
            autoComplete="new-password"
            {...form.getFieldProps("confirmPassword")}
            placeholder="Digite a senha novamente"
            className="min-h-[48px]"
          />

          {error && <AuthAlert tone="error">{error}</AuthAlert>}

          <Button
            type="submit"
            isLoading={isLoading}
            className="min-h-[48px] w-full text-sm font-semibold"
          >
            Criar senha
          </Button>

          <p className="text-center text-xs text-gray-500">
            Depois de criar a senha, você entra e cadastra a verificação em duas
            etapas.
          </p>
        </form>
      )}
    </AdminAuthShell>
  );
}
