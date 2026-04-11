import { type_conversa } from '../types/dbSchemas';
import ConversaRepository from '../repositories/conversaRepository';
import AlunoRepository from '../repositories/alunoRepository';
import TreinadorRepository from '../repositories/treinadorRepository';
import AutorizacaoConversaService from './autorizacaoConversaService';

class ConversaService {
  private conversaRepository: ConversaRepository;
  private alunoRepository: AlunoRepository;
  private treinadorRepository: TreinadorRepository;
  private autorizacaoConversaService: AutorizacaoConversaService;

  constructor() {
    this.conversaRepository = new ConversaRepository();
    this.alunoRepository = new AlunoRepository();
    this.treinadorRepository = new TreinadorRepository();
    this.autorizacaoConversaService = new AutorizacaoConversaService();
  }

  async iniciarOuBuscarConversa(userId: string, dados: { aluno_id?: string }): Promise<type_conversa> {
    const perfil = await this.autorizacaoConversaService.obterPerfilChat(userId);

    let treinadorId: string;
    let alunoId: string;

    if (perfil.tipo === 'treinador') {
      if (!dados.aluno_id) {
        throw new Error('VALIDATION: treinador deve informar aluno_id para iniciar conversa.');
      }

      const aluno = await this.alunoRepository.findById(dados.aluno_id);
      if (!aluno) {
        throw new Error('Aluno nao encontrado');
      }

      if (aluno.treinador_id !== perfil.treinadorId) {
        throw new Error('FORBIDDEN: treinador so pode conversar com seus proprios alunos.');
      }

      treinadorId = perfil.treinadorId;
      alunoId = aluno.id as string;
    } else {
      if (dados.aluno_id && dados.aluno_id !== perfil.alunoId) {
        throw new Error('FORBIDDEN: aluno so pode iniciar conversa usando o proprio perfil.');
      }

      if (!perfil.treinadorId) {
        throw new Error('VALIDATION: aluno nao possui treinador vinculado para iniciar conversa.');
      }

      const treinador = await this.treinadorRepository.findById(perfil.treinadorId);
      if (!treinador) {
        throw new Error('Treinador vinculado nao encontrado');
      }

      treinadorId = perfil.treinadorId;
      alunoId = perfil.alunoId;
    }

    const existente = await this.conversaRepository.findByTreinadorEAluno(treinadorId, alunoId);
    if (existente) return existente;

    return await this.conversaRepository.create({
      treinador_id: treinadorId,
      aluno_id: alunoId,
      ativa: true,
      ultima_mensagem_em: null,
    });
  }

  async listarConversas(userId: string, page: number, limite: number) {
    const perfil = await this.autorizacaoConversaService.obterPerfilChat(userId);

    if (perfil.tipo === 'treinador') {
      return await this.conversaRepository.listByTreinadorId(perfil.treinadorId, page, limite);
    }

    return await this.conversaRepository.listByAlunoId(perfil.alunoId, page, limite);
  }

  async obterConversaPorId(conversaId: string, userId: string): Promise<type_conversa> {
    const perfil = await this.autorizacaoConversaService.obterPerfilChat(userId);
    const conversaAtual = await this.conversaRepository.findById(conversaId);

    if (!conversaAtual) {
      throw new Error('Conversa nao encontrada');
    }

    this.autorizacaoConversaService.assegurarParticipacao(conversaAtual, perfil);
    return conversaAtual;
  }
}

export default ConversaService;
