"use client";

import { useState } from "react";
import Button, { type ButtonProps } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { BillingLimitModal } from "./BillingLimitModal";

interface Props extends Omit<ButtonProps, "onClick"> {
  /** Callback chamado ao clicar quando a ação não está bloqueada. */
  onClick: () => void;
  children: React.ReactNode;
}

/**
 * Botão padrão para abrir o wizard de nova solicitação cirúrgica.
 *
 * Quando a assinatura está bloqueada (suspensa, cancelada ou cota saturada),
 * o clique abre o aviso de bloqueio — com o caminho de upgrade para o dono da
 * conta e a orientação de procurar o administrador para os demais. Antes o
 * clique era um no-op silencioso para todo mundo que não fosse `role=admin`,
 * e um beco sem saída para o admin delegado (a aba de plano só existe para o
 * dono). Para colaboradores sem visibilidade da subscription o botão funciona
 * normalmente — o backend faz a checagem final.
 */
export function NewSurgeryRequestButton({
  onClick,
  children,
  className,
  ...buttonProps
}: Props) {
  const { canCreateSurgeryRequest, blockReason, blockReasonCode } = useAuth();
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const handleClick = () => {
    if (!canCreateSurgeryRequest) {
      setIsBlockModalOpen(true);
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
    <>
      <Tooltip content={blockReason} className="max-w-xs whitespace-normal">
        {button}
      </Tooltip>
      {blockReasonCode && (
        <BillingLimitModal
          isOpen={isBlockModalOpen}
          onClose={() => setIsBlockModalOpen(false)}
          block={{
            reason: blockReasonCode,
            message: blockReason,
          }}
        />
      )}
    </>
  );
}
