import { type_conversa } from '../types/dbSchemas';
import AlunoRepository from '../repositories/alunoRepository';
import TreinadorRepository from '../repositories/treinadorRepository';

type PerfilChat =
  | { tipo: 'aluno'; userId: string; alunoId: string; treinadorId: string | null }
  | { tipo: 'treinador'; userId: string; treinadorId: string };

class AutorizacaoConversaService {
  private alunoRepository: AlunoRepository;
  private treinadorRepository: TreinadorRepository;

  constructor() {
    this.alunoRepository = new AlunoRepository();
    this.treinadorRepository = new TreinadorRepository();
  }

  async obterPerfilChat(userId: string): Promise<PerfilChat> {
    const [perfilAluno, perfilTreinador] = await Promise.all([
      this.alunoRepository.findByUserId(userId),
      this.treinadorRepository.findByUserId(userId),
    ]);

    if (perfilAluno && perfilTreinador) {
      throw new Error('VALIDATION: O usuario autenticado possui perfil duplicado (aluno e treinador).');
    }

    if (perfilTreinador?.id) {
      return {
        tipo: 'treinador',
        userId,
        treinadorId: perfilTreinador.id,
      };
    }

    if (perfilAluno?.id) {
      return {
        tipo: 'aluno',
        userId,
        alunoId: perfilAluno.id,
        treinadorId: perfilAluno.treinador_id ?? null,
      };
    }

    throw new Error('FORBIDDEN: Usuario autenticado nao possui perfil de aluno ou treinador.');
  }

  assegurarParticipacao(conversaAtual: type_conversa, perfil: PerfilChat): void {
    if (perfil.tipo === 'treinador' && conversaAtual.treinador_id !== perfil.treinadorId) {
      throw new Error('FORBIDDEN: Voce nao participa desta conversa.');
    }

    if (perfil.tipo === 'aluno' && conversaAtual.aluno_id !== perfil.alunoId) {
      throw new Error('FORBIDDEN: Voce nao participa desta conversa.');
    }
  }
}

export default AutorizacaoConversaService;
