import { type_mensagem_conversa } from '../types/dbSchemas';
import ConversaRepository from '../repositories/conversaRepository';
import MensagemConversaRepository from '../repositories/mensagemConversaRepository';
import AutorizacaoConversaService from './autorizacaoConversaService';

import { notificarNovaMensagem } from '../integrations/notificacoes';
import { DataBase } from '../config/DbConnect';
import { aluno, treinador, user } from '../config/db/schema';
import { eq } from 'drizzle-orm';

class MensagemConversaService {
  private conversaRepository: ConversaRepository;
  private mensagemConversaRepository: MensagemConversaRepository;
  private autorizacaoConversaService: AutorizacaoConversaService;

  constructor() {
    this.conversaRepository = new ConversaRepository();
    this.mensagemConversaRepository = new MensagemConversaRepository();
    this.autorizacaoConversaService = new AutorizacaoConversaService();
  }

  async enviarMensagem(conversaId: string, userId: string, conteudo: string): Promise<type_mensagem_conversa> {
    const perfil = await this.autorizacaoConversaService.obterPerfilChat(userId);
    const conversaAtual = await this.conversaRepository.findById(conversaId);

    if (!conversaAtual) {
      throw new Error('Conversa nao encontrada');
    }

    this.autorizacaoConversaService.assegurarParticipacao(conversaAtual, perfil);

    const remetenteTipo = perfil.tipo === 'treinador' ? 'TREINADOR' : 'ALUNO';
    const agora = new Date();

    const mensagem = await this.mensagemConversaRepository.create({
      conversa_id: conversaId,
      remetente_tipo: remetenteTipo,
      remetente_user_id: userId,
      conteudo,
      enviada_em: agora,
      ativa: true,
    });

    await this.conversaRepository.updateUltimaMensagem(conversaId, agora);

    // Enviar notificação push para a outra parte
    void (async () => {
      try {
        const destinoUserId = remetenteTipo === 'TREINADOR' ? conversaAtual.aluno_id : conversaAtual.treinador_id;
        
        let fcmTokenDestino: string | null | undefined = null;
        
        if (remetenteTipo === 'TREINADOR') {
            // Destino é Aluno
            const alunoData = await DataBase.select({ fcm_token: aluno.fcm_token })
                .from(aluno)
                .where(eq(aluno.id, destinoUserId))
                .limit(1);
            fcmTokenDestino = alunoData[0]?.fcm_token;
        } else {
            // Destino é Treinador
            const treinadorData = await DataBase.select({ fcm_token: treinador.fcm_token })
                .from(treinador)
                .where(eq(treinador.id, destinoUserId))
                .limit(1);
            fcmTokenDestino = treinadorData[0]?.fcm_token;
        }

        if (fcmTokenDestino) {
            const remetenteData = await DataBase.select({ nome: user.name })
                .from(user)
                .where(eq(user.id, userId))
                .limit(1);
            
            const nomeRemetente = remetenteData[0]?.nome ?? 'Nova mensagem';
            await notificarNovaMensagem(fcmTokenDestino, nomeRemetente, conversaId);
        }
      } catch (e) {
          console.error('[MensagemConversaService] Erro ao enviar notificação de chat:', e);
      }
    })();

    return mensagem;
  }

  async listarMensagens(conversaId: string, userId: string, page: number, limite: number) {
    const perfil = await this.autorizacaoConversaService.obterPerfilChat(userId);
    const conversaAtual = await this.conversaRepository.findById(conversaId);

    if (!conversaAtual) {
      throw new Error('Conversa nao encontrada');
    }

    this.autorizacaoConversaService.assegurarParticipacao(conversaAtual, perfil);

    return await this.mensagemConversaRepository.listByConversa(conversaId, page, limite);
  }

  async marcarComoLidas(conversaId: string, userId: string) {
    const perfil = await this.autorizacaoConversaService.obterPerfilChat(userId);
    const conversaAtual = await this.conversaRepository.findById(conversaId);

    if (!conversaAtual) {
      throw new Error('Conversa nao encontrada');
    }

    this.autorizacaoConversaService.assegurarParticipacao(conversaAtual, perfil);

    const marcadas = await this.mensagemConversaRepository.marcarComoLidas(conversaId, userId);
    return { marcadas };
  }
}

export default MensagemConversaService;
