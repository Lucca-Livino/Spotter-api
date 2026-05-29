import npaasClient from "./npaas";

/**
 * Envia uma notificação push para um único token FCM via NPaaS.
 * @param fcmToken  Token do dispositivo do aluno
 * @param titulo    Título da notificação
 * @param corpo     Corpo da mensagem
 * @param dados     Payload extra (navegação, IDs de entidade, etc.)
 */
export async function enviarPushParaUsuario(
  fcmToken: string,
  titulo: string,
  corpo: string,
  dados?: Record<string, string>,
): Promise<void> {
  try {
    await npaasClient.post("/notifications/send", {
      to:       fcmToken,
      title:    titulo,
      body:     corpo,
      data:     dados ?? {},
    });
  } catch (error) {
    console.error("[NPaaS] Falha ao enviar notificação push:", error);
  }
}

// ── Notificações contextuais do app de academia ──────────────

export async function notificarSessaoIniciada(
  fcmToken: string,
  nomeTreino: string,
): Promise<void> {
  await enviarPushParaUsuario(
    fcmToken,
    "💪 Treino iniciado!",
    `Sua sessão de ${nomeTreino} foi registrada. Bora!`,
    { tipo: "SESSAO_INICIADA" },
  );
}

export async function notificarSessaoFinalizada(
  fcmToken: string,
  nomeTreino: string,
  totalExercicios: number,
): Promise<void> {
  await enviarPushParaUsuario(
    fcmToken,
    "🏆 Treino concluído!",
    `Você finalizou ${totalExercicios} exercício(s) de ${nomeTreino}. Continue assim!`,
    { tipo: "SESSAO_FINALIZADA" },
  );
}

export async function notificarTreinoAtribuido(
  fcmToken: string,
  nomeTreino: string,
): Promise<void> {
  await enviarPushParaUsuario(
    fcmToken,
    "📋 Novo treino disponível!",
    `Seu treinador criou o treino "${nomeTreino}" para você.`,
    { tipo: "TREINO_ATRIBUIDO" },
  );
}

export async function notificarTreinoAtualizado(
  fcmToken: string,
  nomeTreino: string,
): Promise<void> {
  await enviarPushParaUsuario(
    fcmToken,
    "🔄 Treino atualizado",
    `O treino "${nomeTreino}" foi atualizado pelo seu treinador.`,
    { tipo: "TREINO_ATUALIZADO" },
  );
}

export async function notificarTreinoConcluidoTreinador(
  fcmToken: string,
  nomeAluno: string,
  nomeTreino: string,
): Promise<void> {
  await enviarPushParaUsuario(
    fcmToken,
    "✅ Aluno concluiu um treino",
    `${nomeAluno} finalizou a sessão de ${nomeTreino}.`,
    { tipo: "SESSAO_FINALIZADA_TREINADOR" },
  );
}

export async function notificarNovaMensagem(
  fcmToken: string,
  nomeRemetente: string,
  conversaId: string,
): Promise<void> {
  await enviarPushParaUsuario(
    fcmToken,
    "💬 Nova Mensagem",
    `${nomeRemetente} enviou uma mensagem para você.`,
    { tipo: "NOVA_MENSAGEM", conversa_id: conversaId },
  );
}

export async function notificarAvaliacaoFisicaAgendada(
  fcmToken: string,
): Promise<void> {
  await enviarPushParaUsuario(
    fcmToken,
    "📊 Avaliação Física Agendada",
    "Sua avaliação física foi registrada. Confira os detalhes no app.",
    { tipo: "AVALIACAO_AGENDADA" },
  );
}
