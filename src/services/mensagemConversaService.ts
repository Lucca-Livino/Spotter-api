import { type_mensagem_conversa } from '../types/dbSchemas';
import ConversaRepository from '../repositories/conversaRepository';
import MensagemConversaRepository from '../repositories/mensagemConversaRepository';
import AutorizacaoConversaService from './autorizacaoConversaService';

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
