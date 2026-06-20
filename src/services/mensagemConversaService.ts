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
        const destinoPerfilId = remetenteTipo === 'TREINADOR' ? conversaAtual.aluno_id : conversaAtual.treinador_id;
        
        let targetUserId: string | null = null;
        
        if (remetenteTipo === 'TREINADOR') {
            // Destino é Aluno
            const alunoData = await DataBase.select({ user_id: aluno.user_id })
                .from(aluno)
                .where(eq(aluno.id, destinoPerfilId))
                .limit(1);
            targetUserId = alunoData[0]?.user_id || null;
        } else {
            // Destino é Treinador
            const treinadorData = await DataBase.select({ user_id: treinador.user_id })
                .from(treinador)
                .where(eq(treinador.id, destinoPerfilId))
                .limit(1);
            targetUserId = treinadorData[0]?.user_id || null;
        }

        if (targetUserId) {
            const remetenteData = await DataBase.select({ nome: user.name })
                .from(user)
                .where(eq(user.id, userId))
                .limit(1);
            
            const nomeRemetente = remetenteData[0]?.nome ?? 'Nova mensagem';
            await notificarNovaMensagem(targetUserId, nomeRemetente, conversaId);
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
