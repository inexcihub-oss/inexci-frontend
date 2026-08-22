import { Permission } from "@/lib/permissions";

/**
 * Toda a copy do onboarding vive aqui, separada do motor.
 *
 * Regra de estilo: no máximo duas linhas por passo, verbo no imperativo, sem
 * jargão. Passo que precisa de três linhas é sinal de que são dois passos.
 */

export const BOAS_VINDAS = {
  titulo: "Bem-vindo à INEXCI",
  slides: [
    {
      titulo: "O que é a INEXCI",
      corpo:
        "Da indicação cirúrgica ao pagamento, num lugar só: solicitação, análise do convênio, agendamento, atendimento e faturamento.",
    },
    {
      titulo: "Como funciona",
      corpo:
        "A solicitação caminha por status — de Pendente a Finalizada. A cada etapa, a plataforma mostra o que falta para avançar.",
    },
  ],
  pular: "Pular por agora",
  avancar: "Avançar",
  comecar: "Começar",
};

/**
 * Slide 3, montado a partir das áreas do usuário — uma linha por área, e o
 * slide as lista. Emendar as frases num parágrafo só dava um paredão de texto
 * justamente para a persona principal: o médico dono da conta tem as quatro.
 *
 * Tipado por `Permission`, não por `string`: assim uma área nova sem frase aqui
 * quebra a compilação em vez de renderizar um parágrafo vazio.
 */
export const SEU_PAPEL: Record<Permission, string> = {
  [Permission.AGENDA]: "Marcar, confirmar e remarcar consultas.",
  [Permission.ATENDIMENTO]:
    "Abrir a ficha do paciente e registrar o atendimento.",
  [Permission.SOLICITACOES]:
    "Montar a solicitação cirúrgica e acompanhar até o pagamento.",
  [Permission.ADMINISTRACAO]:
    "Convidar a equipe e definir o que cada um acessa.",
};

export const CHECKLIST = {
  titulo: "Primeiros passos",
  dispensar: "Dispensar",
  ver: "Ver",
  refazer: "Refazer",
  concluido: "Tudo pronto. Você pode rever qualquer passo em Configurações.",
  erroReiniciar: "Não foi possível reiniciar agora. Tente de novo em instantes.",
};

export const TOUR_UI = {
  sair: "Sair do tour",
  proximo: "Próximo",
  anterior: "Anterior",
  concluir: "Concluir",
  interrompido:
    "Não conseguimos abrir esta parte agora. Você pode tentar de novo em Configurações.",
};

/**
 * A assinatura já vinha na Fase 1 sozinha, por ser pré-requisito do laudo. A
 * Fase 2 completa a trilha com o cabeçalho e a regra que mais gera frustração
 * quando não é dita antes: documento emitido não se edita.
 */
export const TRILHA_DOCUMENTOS_MEDICO = {
  label: "Preparar seus documentos",
  descricao:
    "Assinatura e cabeçalho aparecem no laudo, na receita, no atestado e no pedido de exame.",
  passos: {
    assinatura: {
      titulo: "Envie sua assinatura",
      corpo:
        "Uma imagem de até 2 MB, com fundo claro. Ela entra sozinha no laudo da solicitação e nos documentos do atendimento.",
    },
    cabecalhoLogo: {
      titulo: "A logo do seu cabeçalho",
      corpo:
        "PNG ou JPG de até 2 MB. Ela aparece no topo de todo documento que você emitir.",
    },
    cabecalhoTexto: {
      titulo: "O texto do cabeçalho",
      corpo:
        "Nome, especialidade, CRM, endereço e contato. É o que identifica você em receita, atestado e pedido de exame.",
    },
    previa: {
      titulo: "Confira antes de emitir",
      corpo:
        "Esta é a prévia do que sai no PDF. Vale conferir agora: documento emitido não se edita — corrigir é emitir outro.",
    },
  },
};

export const TRILHA_ATENDIMENTO = {
  label: "Atender um paciente",
  descricao:
    "Da consulta agendada à ficha finalizada, incluindo receita, atestado e pedido de exame.",
  passos: {
    hub: {
      titulo: "Suas consultas ficam aqui",
      corpo:
        "Próximas e realizadas, na mesma tela. É daqui que o atendimento começa.",
    },
    iniciar: {
      titulo: "Abra a consulta e comece",
      corpo:
        "Abrir a ficha é ato do médico: quem agenda não atende. Depois de realizada, todos com Atendimento podem ler.",
    },
    abas: {
      titulo: "Quatro abas, um paciente",
      corpo:
        "Atendimento é onde você escreve. Histórico, Cadastro e Documentos trazem o resto sem sair da consulta.",
    },
    indicacao: {
      titulo: "Marque o paciente cirúrgico",
      corpo:
        "Ao finalizar a ficha, a solicitação nasce em Pendente e os documentos do paciente vão junto. Ficha finalizada é imutável — correção vira adendo.",
    },
    documentos: {
      titulo: "Emita receita, atestado e exames",
      corpo:
        "Cada um tem prévia antes do PDF. Depois de emitido não se edita: corrigir é emitir outro.",
    },
  },
};

export const TRILHA_SOLICITACOES = {
  label: "Criar e enviar uma solicitação",
  descricao:
    "Do wizard ao envio para o convênio, incluindo criar a solicitação a partir de um documento.",
  passos: {
    abrirWizard: {
      titulo: "Comece por aqui",
      corpo:
        "Este botão abre o wizard. Ele pede paciente, hospital, convênio e procedimento — nessa ordem.",
    },
    cadastroNoModal: {
      titulo: "Cadastre sem sair daqui",
      corpo:
        "Paciente, hospital, convênio ou procedimento que ainda não existem podem ser criados por este botão, sem abandonar a solicitação.",
    },
    requisitos: {
      titulo: "Complete antes de enviar",
      corpo:
        "A solicitação só sai de Pendente quando estes itens estiverem completos. O painel de pendências mostra o que falta a qualquer momento.",
      /** Preenchido em runtime com os rótulos vindos do backend. */
      comRequisitos: (rotulos: string[]) =>
        rotulos.length
          ? `A solicitação só sai de Pendente com: ${rotulos.join(", ")}. O painel de pendências mostra o que falta a qualquer momento.`
          : "A solicitação só sai de Pendente quando todos os itens obrigatórios estiverem completos. O painel de pendências mostra o que falta a qualquer momento.",
    },
    porDocumento: {
      titulo: "Ou comece por um documento",
      corpo:
        "Envie o pedido, o laudo ou a guia e a plataforma preenche o que conseguir ler. Você revisa antes de salvar.",
    },
  },
};

export const TRILHA_AGENDA = {
  label: "Marcar uma consulta",
  descricao:
    "Agendar, confirmar e remarcar — e o lembrete que o paciente recebe sozinho.",
  passos: {
    novaConsulta: {
      titulo: "Comece por aqui",
      corpo:
        "Este botão abre o formulário da consulta, já no dia que estiver aberto na agenda.",
    },
    horario: {
      titulo: "Data, hora e duração",
      corpo:
        "A plataforma recusa dois atendimentos sobrepostos para o mesmo médico e avisa quando o horário cai fora do expediente.",
    },
    status: {
      titulo: "Confirmar, remarcar ou cancelar",
      corpo:
        "Abra a consulta na agenda e mude o status por aqui. Cancelada libera o horário para outra marcação.",
    },
    lembrete: {
      titulo: "O lembrete vai sozinho",
      corpo:
        "O paciente recebe um aviso 24 h antes, por e-mail. Ninguém da equipe precisa mandar.",
    },
  },
};
