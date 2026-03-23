import SessaoRepository, { SessaoComDetalhe } from '../repositories/sessaoRepository';
import UsuarioRepository from '../repositories/usuarioRepository';
import { sessaoSchema, sessaoIdSchema } from '../utils/validations/sessaoValidation';
import { ZodError } from 'zod';
import { type_sessao_exercicio, type_sessao_serie, type_sessao_treino } from '../types/dbSchemas';

class SessaoService {
    private repository: SessaoRepository;
    private usuarioRepository: UsuarioRepository;

    constructor() {
        this.repository = new SessaoRepository();
        this.usuarioRepository = new UsuarioRepository();
    }

    async createSessao(body: any, userId: string): Promise<SessaoComDetalhe> {
        try {
            const dadosValidados = sessaoSchema.parse(body);

            const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

            if (!perfil.isAluno || !perfil.alunoId) {
                throw new Error('FORBIDDEN: apenas alunos podem iniciar sessões de treino');
            }

            const treinoComExercicios = await this.repository.buscarTreinoComExercicios(
                dadosValidados.treino_id,
                perfil.alunoId,
            );

            if (!treinoComExercicios) {
                throw new Error('Treino não encontrado ou não pertence ao aluno autenticado');
            }

            const emAndamento = await this.repository.verificarSessaoEmAndamento(perfil.alunoId);
            if (emAndamento) {
                throw new Error('CONFLICT: já existe uma sessão em andamento para este aluno');
            }

            const novaSessao: type_sessao_treino = {
                aluno_id: perfil.alunoId,
                treino_id: dadosValidados.treino_id,
            };

            const sessaoExercicios: type_sessao_exercicio[] = treinoComExercicios.exercicios.map((te) => ({
                sessao_treino_id: '', 
                treino_exercicio_id: te.treino_exercicio_id,
            }));

            const sessaoSeries: type_sessao_serie[] = [];
            for (const te of treinoComExercicios.exercicios) {
                for (let i = 1; i <= te.series; i++) {
                    sessaoSeries.push({
                        sessao_exercicio_id: te.treino_exercicio_id, 
                        numero_serie: i,
                        status: 'PENDENTE',
                    });
                }
            }

            const sessaoId = await this.repository.create(novaSessao, sessaoExercicios, sessaoSeries);

            return await this.repository.findById(sessaoId) as SessaoComDetalhe;
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[SessaoService] [createSessao] Falha na validação Zod:', error.issues);
            }
            throw error;
        }
    }

    async getSessaoById(idParam: string, userId: string): Promise<SessaoComDetalhe> {
        const id = sessaoIdSchema.parse(idParam);

        const sessao = await this.repository.findById(id);
        if (!sessao) {
            throw new Error('Sessão não encontrada');
        }

        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        if (!perfil.isAdmin && perfil.alunoId !== sessao.aluno_id) {
            throw new Error('FORBIDDEN: você não tem permissão para visualizar esta sessão');
        }

        return sessao;
    }
}

export default SessaoService;
