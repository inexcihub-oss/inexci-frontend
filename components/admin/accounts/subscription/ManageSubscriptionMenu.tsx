"use client";

import { useRef, useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { AdminAccountSubscription } from "@/services/admin.service";
import { ExtendTrialModal } from "./ExtendTrialModal";
import { GrantInternalAccessModal } from "./GrantInternalAccessModal";
import { RevokeInternalAccessModal } from "./RevokeInternalAccessModal";

type ActionId = "extend" | "grant" | "revoke";

interface Item {
  id: ActionId;
  label: string;
  disabled: boolean;
  reason: string | null;
}

function buildItems(sub: AdminAccountSubscription): Item[] {
  const items: Item[] = [];
  if (sub.situation === "trial" || sub.situation === "trial_expired") {
    items.push({
      id: "extend",
      label: "Estender trial",
      disabled: !sub.canExtendTrial,
      reason: sub.canExtendTrial ? null : sub.trialExtensionBlockedReason,
    });
  }
  if (sub.situation !== "internal") {
    items.push({
      id: "grant",
      label: "Dar acesso interno",
      disabled: !sub.canGrantInternalAccess,
      reason: sub.canGrantInternalAccess
        ? null
        : sub.internalAccessBlockedReason,
    });
  } else {
    items.push({
      id: "revoke",
      label: "Encerrar acesso interno",
      disabled: false,
      reason: null,
    });
  }
  return items;
}

interface Props {
  ownerId: string;
  subscription: AdminAccountSubscription | undefined;
  hasGatewaySubscription: boolean;
}

export function ManageSubscriptionMenu({
  ownerId,
  subscription,
  hasGatewaySubscription,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [action, setAction] = useState<ActionId | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapperRef, () => setMenuOpen(false), menuOpen);

  const items = subscription ? buildItems(subscription) : [];
  const close = () => setAction(null);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={!subscription || items.length === 0}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="ds-toolbar-btn-primary"
      >
        <Settings2 className="h-4 w-4" aria-hidden="true" />
        Gerenciar assinatura
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-1 shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setMenuOpen(false);
                setAction(item.id);
              }}
              className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
            >
              {item.label}
              {item.reason && (
                <span className="mt-0.5 text-xs font-normal text-gray-500">
                  {item.reason}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {action === "extend" && subscription && (
        <ExtendTrialModal
          isOpen
          onClose={close}
          ownerId={ownerId}
          trialEndsAt={subscription.trialEndsAt}
          hasGatewaySubscription={hasGatewaySubscription}
        />
      )}
      {action === "grant" && (
        <GrantInternalAccessModal isOpen onClose={close} ownerId={ownerId} />
      )}
      {action === "revoke" && (
        <RevokeInternalAccessModal isOpen onClose={close} ownerId={ownerId} />
      )}
    </div>
  );
}
