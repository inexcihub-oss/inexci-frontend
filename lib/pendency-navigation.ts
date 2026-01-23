// Mapeamento de chaves de pendências para ações/navegação

export interface PendencyAction {
  type: "navigate" | "modal" | "scroll" | "external";
  target: string;
  label: string;
  description?: string;
}

// Mapeamento de chaves de pendência para ações
export const pendencyActionMap: Record<string, PendencyAction> = {
  // Dados/Informações
  patient_data: {
    type: "scroll",
    target: "patient-section",
    label: "Completar dados",
    description: "Ir para seção do paciente",
  },
  hospital_data: {
    type: "scroll",
    target: "hospital-section",
    label: "Completar dados",
    description: "Ir para seção do hospital",
  },
  health_plan_data: {
    type: "scroll",
    target: "health-plan-section",
    label: "Completar dados",
    description: "Ir para seção do plano de saúde",
  },
  diagnosis_data: {
    type: "scroll",
    target: "diagnosis-section",
    label: "Completar dados",
    description: "Ir para seção de diagnóstico",
  },

  // Procedimentos e OPME
  insert_tuss: {
    type: "scroll",
    target: "procedures-section",
    label: "Adicionar",
    description: "Ir para procedimentos",
  },
  insert_opme: {
    type: "scroll",
    target: "opme-section",
    label: "Adicionar",
    description: "Ir para OPME",
  },

  // Relatório médico
  medical_report: {
    type: "scroll",
    target: "medical-report-section",
    label: "Preencher",
    description: "Ir para relatório médico",
  },

  // Cotações e fornecedores
  select_suppliers: {
    type: "scroll",
    target: "suppliers-section",
    label: "Selecionar",
    description: "Ir para fornecedores",
  },
  quotation_1: {
    type: "scroll",
    target: "quotations-section",
    label: "Adicionar",
    description: "Ir para cotações",
  },
  quotation_2: {
    type: "scroll",
    target: "quotations-section",
    label: "Adicionar",
    description: "Ir para cotações",
  },
  quotation_3: {
    type: "scroll",
    target: "quotations-section",
    label: "Adicionar",
    description: "Ir para cotações",
  },
  insert_quotations: {
    type: "scroll",
    target: "quotations-section",
    label: "Adicionar",
    description: "Ir para cotações",
  },

  // Protocolos
  hospital_protocol: {
    type: "scroll",
    target: "protocols-section",
    label: "Informar",
    description: "Ir para protocolos",
  },
  health_plan_protocol: {
    type: "scroll",
    target: "protocols-section",
    label: "Informar",
    description: "Ir para protocolos",
  },

  // Datas e agendamento
  define_dates: {
    type: "scroll",
    target: "scheduling-section",
    label: "Definir",
    description: "Ir para agendamento",
  },
  patient_choose_date: {
    type: "scroll",
    target: "scheduling-section",
    label: "Escolher",
    description: "Ir para agendamento",
  },
  confirm_surgery: {
    type: "scroll",
    target: "scheduling-section",
    label: "Confirmar",
    description: "Ir para agendamento",
  },

  // Faturamento
  surgery_description: {
    type: "scroll",
    target: "invoice-section",
    label: "Descrever",
    description: "Ir para faturamento",
  },
  invoiced_value: {
    type: "scroll",
    target: "invoice-section",
    label: "Informar",
    description: "Ir para faturamento",
  },
  register_receipt: {
    type: "scroll",
    target: "receipt-section",
    label: "Registrar",
    description: "Ir para recebimento",
  },

  // Análises (sem ação, apenas aguardando)
  wait_analysis: {
    type: "scroll",
    target: "status-section",
    label: "Ver status",
    description: "Aguardando análise do convênio",
  },
  wait_reanalysis: {
    type: "scroll",
    target: "status-section",
    label: "Ver status",
    description: "Aguardando reanálise do convênio",
  },

  // Legacy
  complete_fields: {
    type: "scroll",
    target: "form-section",
    label: "Completar",
    description: "Ir para formulário",
  },
};

/**
 * Obtém a ação de navegação para uma chave de pendência
 */
export function getPendencyAction(key: string): PendencyAction | null {
  // Verificar correspondência exata
  if (pendencyActionMap[key]) {
    return pendencyActionMap[key];
  }

  // Verificar se é uma chave de documento (começa com "document_")
  if (key.startsWith("document_")) {
    return {
      type: "scroll",
      target: "documents-section",
      label: "Anexar",
      description: "Ir para documentos",
    };
  }

  // Verificar chaves customizadas de documentos (criadas pela clínica)
  // Geralmente são números ou IDs
  if (/^\d+$/.test(key)) {
    return {
      type: "scroll",
      target: "documents-section",
      label: "Anexar",
      description: "Ir para documentos",
    };
  }

  return null;
}

/**
 * Executa a navegação para uma pendência
 */
export function executePendencyNavigation(
  action: PendencyAction,
  surgeryRequestId?: string,
): void {
  switch (action.type) {
    case "scroll":
      const element = document.getElementById(action.target);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        // Adicionar highlight temporário
        element.classList.add("ring-2", "ring-primary-500", "ring-offset-2");
        setTimeout(() => {
          element.classList.remove(
            "ring-2",
            "ring-primary-500",
            "ring-offset-2",
          );
        }, 2000);
      }
      break;

    case "navigate":
      if (typeof window !== "undefined") {
        const targetUrl = surgeryRequestId
          ? action.target.replace(":id", surgeryRequestId)
          : action.target;
        window.location.href = targetUrl;
      }
      break;

    case "modal":
      // Dispara evento customizado para abrir modal
      const event = new CustomEvent("openPendencyModal", {
        detail: { modalId: action.target },
      });
      window.dispatchEvent(event);
      break;

    case "external":
      if (typeof window !== "undefined") {
        window.open(action.target, "_blank");
      }
      break;
  }
}

/**
 * Verifica se uma pendência é do tipo "aguardando" (não tem ação do usuário)
 */
export function isWaitingPendency(key: string): boolean {
  const waitingKeys = ["wait_analysis", "wait_reanalysis"];
  return waitingKeys.includes(key);
}
