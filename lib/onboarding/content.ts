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
 * A spec põe a assinatura já na Fase 1, fora da trilha completa de documentos
 * do médico: sem ela o laudo da solicitação sai sem assinar, então ela é
 * pré-requisito da trilha de solicitações, não conteúdo de fase posterior.
 */
export const TRILHA_ASSINATURA = {
  label: "Configurar sua assinatura",
  descricao:
    "Sem ela, o laudo da solicitação e os documentos do atendimento saem sem assinar.",
  passo: {
    titulo: "Envie sua assinatura",
    corpo:
      "Envie uma imagem de até 2 MB, com fundo claro. Ela é aplicada automaticamente no laudo da solicitação e nos documentos do atendimento.",
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
    },
    porDocumento: {
      titulo: "Ou comece por um documento",
      corpo:
        "Envie o pedido, o laudo ou a guia e a plataforma preenche o que conseguir ler. Você revisa antes de salvar.",
    },
  },
};
