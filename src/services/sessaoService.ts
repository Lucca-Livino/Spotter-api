import SessaoRepository, { SessaoComDetalhe } from '../repositories/sessaoRepository';
import UsuarioRepository from '../repositories/usuarioRepository';
import { sessaoSchema, sessaoIdSchema, sessaoListQuerySchema, SessaoListQuery, sessaoUpdateSchema, sessaoExercicioUpdateSchema, exercicioIdSchema } from '../utils/validations/sessaoValidation';
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

        if (!perfil.isAdmin) {
            if (perfil.isAluno && perfil.alunoId !== sessao.aluno_id) {
                throw new Error('FORBIDDEN: você não tem permissão para visualizar esta sessão');
            }
            if (perfil.isTreinador && !perfil.isAluno) {
                const alunosDoTreinador = await this.repository.buscarAlunosDoTreinador(perfil.treinadorId!);
                if (!alunosDoTreinador.includes(sessao.aluno_id)) {
                    throw new Error('FORBIDDEN: você não tem permissão para visualizar esta sessão');
                }
            }
        }

        return sessao;
    }

    async listSessoes(query: any, userId: string): Promise<{
        dados: Omit<SessaoComDetalhe, 'exercicios'>[];
        total: number;
        page: number;
        limite: number;
        totalPages: number;
    }> {
        const filtros = sessaoListQuerySchema.parse(query) as SessaoListQuery;

        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        if (perfil.isAdmin) {
            return this.repository.findAll(filtros);
        }

        if (perfil.isAluno && perfil.alunoId) {
            const alunoIdFiltro = filtros.aluno_id ?? perfil.alunoId;
            if (filtros.aluno_id && filtros.aluno_id !== perfil.alunoId) {
                throw new Error('FORBIDDEN: você só pode visualizar suas próprias sessões');
            }
            return this.repository.findAll({ ...filtros, aluno_id: alunoIdFiltro });
        }

        if (perfil.isTreinador && perfil.treinadorId) {
            const alunosDoTreinador = await this.repository.buscarAlunosDoTreinador(perfil.treinadorId);
            if (alunosDoTreinador.length === 0) {
                return { dados: [], total: 0, page: filtros.page, limite: filtros.limite, totalPages: 0 };
            }
            const alunoIds = filtros.aluno_id
                ? (alunosDoTreinador.includes(filtros.aluno_id) ? [filtros.aluno_id] : null)
                : alunosDoTreinador;

            if (alunoIds === null) {
                return { dados: [], total: 0, page: filtros.page, limite: filtros.limite, totalPages: 0 };
            }

            return this.repository.findAll(filtros, alunoIds);
        }

        throw new Error('FORBIDDEN: perfil de acesso não autorizado');
    }

    async getSessaoEmAndamento(userId: string): Promise<SessaoComDetalhe | null> {
        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        if (!perfil.isAluno || !perfil.alunoId) {
            throw new Error('FORBIDDEN: apenas alunos podem consultar sessão em andamento');
        }

        return this.repository.findEmAndamento(perfil.alunoId);
    }

    async updateSessao(idParam: string, body: any, userId: string): Promise<SessaoComDetalhe> {
        const id = sessaoIdSchema.parse(idParam);
        const dados = sessaoUpdateSchema.parse(body);

        const sessaoStatus = await this.repository.findSessaoStatus(id);
        if (!sessaoStatus) {
            throw new Error('Sessão não encontrada');
        }

        if (sessaoStatus.status !== 'EM_ANDAMENTO') {
            throw new Error('CONFLICT: apenas sessões em andamento podem ser atualizadas');
        }

        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        if (!perfil.isAdmin) {
            if (perfil.isAluno && perfil.alunoId !== sessaoStatus.aluno_id) {
                throw new Error('FORBIDDEN: você não tem permissão para atualizar esta sessão');
            }
            if (perfil.isTreinador && !perfil.isAluno) {
                const alunosDoTreinador = await this.repository.buscarAlunosDoTreinador(perfil.treinadorId!);
                if (!alunosDoTreinador.includes(sessaoStatus.aluno_id)) {
                    throw new Error('FORBIDDEN: você não tem permissão para atualizar esta sessão');
                }
            }
        }

        await this.repository.updateObservacoes(id, dados.observacoes);

        return await this.repository.findById(id) as SessaoComDetalhe;
    }

    async updateSessaoExercicio(
        idParam: string,
        exercicioIdParam: string,
        body: any,
        userId: string,
    ): Promise<SessaoComDetalhe> {
        const id = sessaoIdSchema.parse(idParam);
        const exercicioId = exercicioIdSchema.parse(exercicioIdParam);
        const dados = sessaoExercicioUpdateSchema.parse(body);

        const sessaoStatus = await this.repository.findSessaoStatus(id);
        if (!sessaoStatus) {
            throw new Error('Sessão não encontrada');
        }

        if (sessaoStatus.status !== 'EM_ANDAMENTO') {
            throw new Error('CONFLICT: apenas sessões em andamento podem ser atualizadas');
        }

        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        if (!perfil.isAdmin) {
            if (perfil.isAluno && perfil.alunoId !== sessaoStatus.aluno_id) {
                throw new Error('FORBIDDEN: você não tem permissão para atualizar esta sessão');
            }
            if (perfil.isTreinador && !perfil.isAluno) {
                const alunosDoTreinador = await this.repository.buscarAlunosDoTreinador(perfil.treinadorId!);
                if (!alunosDoTreinador.includes(sessaoStatus.aluno_id)) {
                    throw new Error('FORBIDDEN: você não tem permissão para atualizar esta sessão');
                }
            }
        }

        const sessaoExercicio = await this.repository.findSessaoExercicio(id, exercicioId);
        if (!sessaoExercicio) {
            throw new Error('Exercício não encontrado nesta sessão');
        }

        const updateData: { concluido: boolean; observacoes?: string | null } = { concluido: dados.concluido };
        if (dados.observacoes !== undefined) {
            updateData.observacoes = dados.observacoes;
        }

        await this.repository.updateSessaoExercicio(exercicioId, updateData);

        return await this.repository.findById(id) as SessaoComDetalhe;
    }

    async getSessaoResumo(idParam: string, userId: string): Promise<{
        duracao_minutos: number | null;
        exercicios_concluidos: number;
        exercicios_total: number;
        series_concluidas: number;
        series_total: number;
        volume_total_kg: number;
        taxa_conclusao: number;
    }> {
        const id = sessaoIdSchema.parse(idParam);

        const sessao = await this.repository.findById(id);
        if (!sessao) {
            throw new Error('Sessão não encontrada');
        }

        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        if (!perfil.isAdmin) {
            if (perfil.isAluno && perfil.alunoId !== sessao.aluno_id) {
                throw new Error('FORBIDDEN: você não tem permissão para visualizar esta sessão');
            }
            if (perfil.isTreinador && !perfil.isAluno) {
                const alunosDoTreinador = await this.repository.buscarAlunosDoTreinador(perfil.treinadorId!);
                if (!alunosDoTreinador.includes(sessao.aluno_id)) {
                    throw new Error('FORBIDDEN: você não tem permissão para visualizar esta sessão');
                }
            }
        }

        const resumo = await this.repository.getSessaoResumo(id);
        if (!resumo) {
            throw new Error('Sessão não encontrada');
        }

        return resumo;
    }
}

export default SessaoService;
