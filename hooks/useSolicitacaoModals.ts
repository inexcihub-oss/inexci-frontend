"use client";

import { useCallback, useMemo, useReducer } from "react";

export type SolicitacaoModalKind =
  | "send"
  | "documentReview"
  | "startAnalysis"
  | "updateAuthorizations"
  | "editDateOptions"
  | "reschedule"
  | "defineDate"
  | "surgeryStatus"
  | "invoice"
  | "confirmReceipt"
  | "close"
  | "consentWarning"
  | "consentUpload"
  | "notification";

interface ModalState {
  open: SolicitacaoModalKind | null;
}

type ModalEvent =
  | { type: "open"; kind: SolicitacaoModalKind }
  | { type: "close"; kind?: SolicitacaoModalKind };

export function solicitacaoModalsReducer(
  state: ModalState,
  event: ModalEvent,
): ModalState {
  switch (event.type) {
    case "open":
      return state.open === event.kind ? state : { open: event.kind };
    case "close":
      if (event.kind && state.open !== event.kind) return state;
      return state.open === null ? state : { open: null };
  }
}

export function useSolicitacaoModals() {
  const [state, dispatch] = useReducer(solicitacaoModalsReducer, {
    open: null,
  });

  const open = useCallback(
    (kind: SolicitacaoModalKind) => dispatch({ type: "open", kind }),
    [],
  );
  const close = useCallback(
    (kind?: SolicitacaoModalKind) => dispatch({ type: "close", kind }),
    [],
  );
  const isOpen = useCallback(
    (kind: SolicitacaoModalKind) => state.open === kind,
    [state.open],
  );

  return useMemo(
    () => ({ current: state.open, open, close, isOpen }),
    [state.open, open, close, isOpen],
  );
}
