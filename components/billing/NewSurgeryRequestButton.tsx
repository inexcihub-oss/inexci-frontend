"use client";

import { useState } from "react";
import Button, { type ButtonProps } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { BillingLimitModal } from "./BillingLimitModal";

interface Props extends Omit<ButtonProps, "onClick"> {
  onClick: () => void;
  children: React.ReactNode;
}

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
