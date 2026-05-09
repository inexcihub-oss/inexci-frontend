"use client";

import { useRouter } from "next/navigation";
import Button, { type ButtonProps } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAuth } from "@/contexts/AuthContext";

interface Props extends Omit<ButtonProps, "onClick"> {
  /** Callback chamado ao clicar quando a a\u00e7\u00e3o n\u00e3o est\u00e1 bloqueada. */
  onClick: () => void;
  children: React.ReactNode;
}

/**
 * Botão padrão para abrir o wizard de nova solicitação cirúrgica.
 * Quando a assinatura está bloqueada (suspensa, cancelada ou cota
 * saturada), o clique redireciona para a aba de plano e exibe tooltip
 * explicativo. Para colaboradores sem visibilidade da subscription, o
 * botão funciona normalmente — o backend faz a checagem final.
 */
export function NewSurgeryRequestButton({
  onClick,
  children,
  className,
  ...buttonProps
}: Props) {
  const { canCreateSurgeryRequest, blockReason, isAdmin } = useAuth();
  const router = useRouter();

  const handleClick = () => {
    if (!canCreateSurgeryRequest) {
      if (isAdmin) {
        router.push("/configuracoes?tab=plan");
      }
      return;
    }
    onClick();
  };

  const button = (
    <Button
      {...buttonProps}
      className={className}
      onClick={handleClick}
      aria-disabled={!canCreateSurgeryRequest}
    >
      {children}
    </Button>
  );

  if (canCreateSurgeryRequest || !blockReason) {
    return button;
  }

  return (
    <Tooltip content={blockReason} className="max-w-xs whitespace-normal">
      {button}
    </Tooltip>
  );
}
