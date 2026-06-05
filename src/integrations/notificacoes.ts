import npaasClient from "./npaas";
import { sendHermesEmail } from "./hermes";

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
  console.log(`\n[Push Notification] Preparando envio de notificação "${titulo}" para o token FCM: ${fcmToken || 'NÃO FORNECIDO'}`);
  
  if (!fcmToken) {
    console.warn(`[Push Notification] Abortado: fcmToken está vazio ou indefinido.`);
    return;
  }

  try {
    const response = await npaasClient.post("/notifications/send", {
      to:       fcmToken,
      title:    titulo,
      body:     corpo,
      data:     dados ?? {},
    });
    console.log(`[Push Notification] Enviada com sucesso! Resposta do NPaaS:`, response.data);
  } catch (error: any) {
    console.error("[Push Notification] Falha ao enviar notificação via NPaaS:", error?.response?.data || error.message || error);
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

// ── Notificações por e-mail ──────────────

export async function enviarEmailResetSenha(email: string, nome: string, link: string): Promise<void> {
  const apiKey = process.env.HERMES_API_KEY;
  const templateId = "63b95631-70ef-49fc-b883-47bad53174de";
  
  if (!apiKey) {
    console.warn("[Notificacoes] HERMES_API_KEY não configurada. E-mail de reset não enviado.");
    return;
  }

  await sendHermesEmail({
    apiKey,
    to: email,
    subject: "Recuperação de Senha - Spotter",
    templateId,
    variables: {
      nome_sistema: "Spotter",
      nome_usuario: nome,
      tempo_expiracao: "30 minutos",
      link_recuperacao: link,
    }
  });
}

export async function enviarEmailBoasVindas() {
  // TODO: Implementar depois
}
