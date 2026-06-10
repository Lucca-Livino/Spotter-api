import npaasClient from "./npaas";
import { sendHermesEmail } from "./hermes";

/**
 * Envia uma notificação push para um usuário via NPaaS.
 * O envio é assíncrono: a resposta imediata confirma o enfileiramento.
 * As estatísticas reais (sucessos/falhas) são preenchidas pelo NPaaS
 * após o processamento e podem ser consultadas via GET /api/v1/notificacoes/{id}.
 *
 * @param userId  ID do usuário destinatário
 * @param titulo  Título da notificação
 * @param corpo   Corpo da mensagem
 * @param dados   Payload extra (navegação, IDs de entidade, etc.)
 */
export async function enviarPushParaUsuario(
  userId: string,
  titulo: string,
  corpo: string,
  dados?: Record<string, string>,
): Promise<void> {
  console.log(`\n[NPaaS] Enviando push "${titulo}" para usuário: ${userId}`);

  try {
    const response = await npaasClient.post("/api/v1/notificacoes/enviar", {
      usuarioId:  userId,
      titulo,
      corpo,
      dados:      dados ?? {},
      canal:      "push",
      prioridade: "alta",
    });
    const notificacao = response.data?.dados;
    // Nota: as estatísticas aqui refletem o estado no momento do enfileiramento.
    // O processamento real pelo FCM é assíncrono — consulte GET /api/v1/notificacoes/{id}
    // para ver o status final (sucessos/falhas por dispositivo).
    console.log(`[NPaaS] Push enfileirado com sucesso! ID: ${notificacao?._id ?? '?'}, Status: ${notificacao?.status ?? '?'}, Dispositivos encontrados: ${notificacao?.estatisticas?.totalDispositivos ?? '?'}`);
  } catch (error: any) {
    console.error("[NPaaS] Falha ao enviar notificação push:", error?.response?.data || error.message);
  }
}

// ── Notificações contextuais do app de academia ──────────────

export async function notificarSessaoIniciada(
  userId: string,
  nomeTreino: string,
): Promise<void> {
  await enviarPushParaUsuario(
    userId,
    "💪 Treino iniciado!",
    `Sua sessão de ${nomeTreino} foi registrada. Bora!`,
    { tipo: "SESSAO_INICIADA" },
  );
}

export async function notificarSessaoFinalizada(
  userId: string,
  nomeTreino: string,
  totalExercicios: number,
): Promise<void> {
  await enviarPushParaUsuario(
    userId,
    "🏆 Treino concluído!",
    `Você finalizou ${totalExercicios} exercício(s) de ${nomeTreino}. Continue assim!`,
    { tipo: "SESSAO_FINALIZADA" },
  );
}

export async function notificarTreinoAtribuido(
  userId: string,
  nomeTreino: string,
): Promise<void> {
  await enviarPushParaUsuario(
    userId,
    "📋 Novo treino disponível!",
    `Seu treinador criou o treino "${nomeTreino}" para você.`,
    { tipo: "TREINO_ATRIBUIDO" },
  );
}

export async function notificarTreinoAtualizado(
  userId: string,
  nomeTreino: string,
): Promise<void> {
  await enviarPushParaUsuario(
    userId,
    "🔄 Treino atualizado",
    `O treino "${nomeTreino}" foi atualizado pelo seu treinador.`,
    { tipo: "TREINO_ATUALIZADO" },
  );
}

export async function notificarTreinoConcluidoTreinador(
  userId: string,
  nomeAluno: string,
  nomeTreino: string,
): Promise<void> {
  await enviarPushParaUsuario(
    userId,
    "✅ Aluno concluiu um treino",
    `${nomeAluno} finalizou a sessão de ${nomeTreino}.`,
    { tipo: "SESSAO_FINALIZADA_TREINADOR" },
  );
}

export async function notificarNovaMensagem(
  userId: string,
  nomeRemetente: string,
  conversaId: string,
): Promise<void> {
  await enviarPushParaUsuario(
    userId,
    "💬 Nova Mensagem",
    `${nomeRemetente} enviou uma mensagem para você.`,
    { tipo: "NOVA_MENSAGEM", conversa_id: conversaId },
  );
}

export async function notificarAvaliacaoFisicaAgendada(
  userId: string,
): Promise<void> {
  await enviarPushParaUsuario(
    userId,
    "📊 Avaliação Física Agendada",
    "Sua avaliação física foi registrada. Confira os detalhes no app.",
    { tipo: "AVALIACAO_AGENDADA" },
  );
}

export async function notificarSessaoCancelada(
  userId: string,
  nomeTreino: string,
): Promise<void> {
  await enviarPushParaUsuario(
    userId,
    "❌ Treino cancelado",
    `A sessão de ${nomeTreino} foi cancelada.`,
    { tipo: "SESSAO_CANCELADA" },
  );
}

export async function notificarTreinoRemovido(
  userId: string,
  nomeTreino: string,
): Promise<void> {
  await enviarPushParaUsuario(
    userId,
    "🗑️ Treino removido",
    `O treino "${nomeTreino}" foi removido pelo seu treinador.`,
    { tipo: "TREINO_REMOVIDO" },
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
