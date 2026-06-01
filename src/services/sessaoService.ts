import SessaoRepository, { SessaoComDetalhe } from '../repositories/sessaoRepository';
import UsuarioRepository from '../repositories/usuarioRepository';
import { sessaoSchema, sessaoIdSchema, sessaoListQuerySchema, SessaoListQuery, sessaoUpdateSchema, sessaoExercicioUpdateSchema, exercicioIdSchema, sessaoSeriesUpdateSchema, SessaoSeriesUpdate, reordenarExerciciosSchema, ReordenarExerciciosInput } from '../utils/validations/sessaoValidation';
import { ZodError } from 'zod';
import { type_sessao_exercicio, type_sessao_serie, type_sessao_treino } from '../types/dbSchemas';
import { notificarSessaoFinalizada, notificarSessaoIniciada, notificarTreinoConcluidoTreinador } from '../integrations/notificacoes';
import { DataBase } from '../config/DbConnect';
import { aluno, treinador, user } from '../config/db/schema';
import { eq } from 'drizzle-orm';

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

            const sessaoExercicios: type_sessao_exercicio[] = treinoComExercicios.exercicios.map((te, idx) => ({
                sessao_treino_id: '',
                treino_exercicio_id: te.treino_exercicio_id,
                ordem: idx + 1,
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

            // Enviar notificação push (não-bloqueante)
            void (async () => {
                try {
                    const alunoData = await DataBase.select({ fcm_token: aluno.fcm_token })
                        .from(aluno)
                        .where(eq(aluno.id, perfil.alunoId!))
                        .limit(1);

                    const fcmToken = alunoData[0]?.fcm_token;
                    if (fcmToken) {
                        await notificarSessaoIniciada(fcmToken, treinoComExercicios.nome ?? 'Treino');
                    }
                } catch (e) {
                    console.error('[SessaoService] Erro ao enviar notificação de início:', e);
                }
            })();

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

        if (!perfil.isAdmin && !perfil.isAluno && !perfil.isTreinador) {
            throw new Error('FORBIDDEN: perfil de acesso não autorizado');
        }

        if (!perfil.isAdmin || perfil.isAluno) {
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

        if (perfil.isAdmin && !perfil.isAluno) {
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
            if (filtros.aluno_id && !alunosDoTreinador.includes(filtros.aluno_id)) {
                return { dados: [], total: 0, page: filtros.page, limite: filtros.limite, totalPages: 0 };
            }

            const alunoIds = filtros.aluno_id
                ? [filtros.aluno_id]
                : alunosDoTreinador;

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

        if (!perfil.isAdmin && !perfil.isAluno && !perfil.isTreinador) {
            throw new Error('FORBIDDEN: perfil de acesso não autorizado');
        }

        if (!perfil.isAdmin || perfil.isAluno) {
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

        if (!perfil.isAdmin && !perfil.isAluno && !perfil.isTreinador) {
            throw new Error('FORBIDDEN: perfil de acesso não autorizado');
        }

        if (!perfil.isAdmin || perfil.isAluno) {
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

        const updateData: { concluido: boolean; observacoes?: string | null; inicio?: Date | null; fim?: Date | null } = { concluido: dados.concluido };
        if (dados.observacoes !== undefined) {
            updateData.observacoes = dados.observacoes;
        }
        if (dados.inicio !== undefined) {
            updateData.inicio = dados.inicio ? new Date(dados.inicio) : null;
        }
        if (dados.fim !== undefined) {
            updateData.fim = dados.fim ? new Date(dados.fim) : null;
        } else if (dados.concluido === true) {
            updateData.fim = new Date();
        }

        if (updateData.fim !== undefined && updateData.fim !== null) {
            const inicioInfo = await this.repository.findSessaoExercicioInicio(exercicioId);
            if (inicioInfo && inicioInfo.inicio === null && updateData.inicio === undefined) {
                updateData.inicio = updateData.fim;
            }
        }

        await this.repository.updateSessaoExercicio(exercicioId, updateData);

        return await this.repository.findById(id) as SessaoComDetalhe;
    }

    private async _verificarAcessoSessao(userId: string, sessaoAlunoId: string): Promise<void> {
        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        if (!perfil.isAdmin && !perfil.isAluno && !perfil.isTreinador) {
            throw new Error('FORBIDDEN: perfil de acesso não autorizado');
        }

        if (!perfil.isAdmin || perfil.isAluno) {
            if (perfil.isAluno && perfil.alunoId !== sessaoAlunoId) {
                throw new Error('FORBIDDEN: você não tem permissão para acessar esta sessão');
            }
            if (perfil.isTreinador && !perfil.isAluno) {
                const alunosDoTreinador = await this.repository.buscarAlunosDoTreinador(perfil.treinadorId!);
                if (!alunosDoTreinador.includes(sessaoAlunoId)) {
                    throw new Error('FORBIDDEN: você não tem permissão para acessar esta sessão');
                }
            }
        }
    }

    private validarSerieRealizadaPorTipo(
        serie: {
            numero_serie: number;
            repeticoes_realizadas?: number | null;
            tempo_realizado_segundos?: number | null;
            distancia_realizada_metros?: number | null;
            status: 'PENDENTE' | 'CONCLUIDA' | 'PULADA';
        },
        tipo: 'REPETICAO' | 'TEMPO' | 'DISTANCIA',
    ): void {
        const repsPreenchido = serie.repeticoes_realizadas !== undefined && serie.repeticoes_realizadas !== null;
        const tempoPreenchido = serie.tempo_realizado_segundos !== undefined && serie.tempo_realizado_segundos !== null;
        const distanciaPreenchida = serie.distancia_realizada_metros !== undefined && serie.distancia_realizada_metros !== null;
        const ctx = `série ${serie.numero_serie}:`;

        if (tipo === 'REPETICAO') {
            if (tempoPreenchido) {
                throw new Error(`VALIDATION: ${ctx} tempo_realizado_segundos não se aplica a exercícios tipo REPETICAO`);
            }
            if (distanciaPreenchida) {
                throw new Error(`VALIDATION: ${ctx} distancia_realizada_metros não se aplica a exercícios tipo REPETICAO`);
            }
            if (serie.status === 'CONCLUIDA' && !repsPreenchido) {
                throw new Error(`VALIDATION: ${ctx} repeticoes_realizadas é obrigatório para série CONCLUIDA tipo REPETICAO`);
            }
        } else if (tipo === 'TEMPO') {
            if (repsPreenchido) {
                throw new Error(`VALIDATION: ${ctx} repeticoes_realizadas não se aplica a exercícios tipo TEMPO`);
            }
            if (distanciaPreenchida) {
                throw new Error(`VALIDATION: ${ctx} distancia_realizada_metros não se aplica a exercícios tipo TEMPO`);
            }
            if (serie.status === 'CONCLUIDA' && !tempoPreenchido) {
                throw new Error(`VALIDATION: ${ctx} tempo_realizado_segundos é obrigatório para série CONCLUIDA tipo TEMPO`);
            }
        } else if (tipo === 'DISTANCIA') {
            if (repsPreenchido) {
                throw new Error(`VALIDATION: ${ctx} repeticoes_realizadas não se aplica a exercícios tipo DISTANCIA`);
            }
            if (serie.status === 'CONCLUIDA' && !distanciaPreenchida) {
                throw new Error(`VALIDATION: ${ctx} distancia_realizada_metros é obrigatório para série CONCLUIDA tipo DISTANCIA`);
            }
        }
    }

    async updateSeriesExercicio(
        idParam: string,
        exercicioIdParam: string,
        body: any,
        userId: string,
    ): Promise<SessaoComDetalhe> {
        const id = sessaoIdSchema.parse(idParam);
        const exercicioId = exercicioIdSchema.parse(exercicioIdParam);
        const dados: SessaoSeriesUpdate = sessaoSeriesUpdateSchema.parse(body);

        const sessaoStatus = await this.repository.findSessaoStatus(id);
        if (!sessaoStatus) {
            throw new Error('Sessão não encontrada');
        }

        if (sessaoStatus.status !== 'EM_ANDAMENTO') {
            throw new Error('CONFLICT: a sessão não está em andamento');
        }

        await this._verificarAcessoSessao(userId, sessaoStatus.aluno_id);

        const sessaoExercicio = await this.repository.findSessaoExercicio(id, exercicioId);
        if (!sessaoExercicio) {
            throw new Error('Exercício não encontrado nesta sessão');
        }

        for (const serie of dados.series) {
            this.validarSerieRealizadaPorTipo(serie, sessaoExercicio.tipo_exercicio);
        }

        const exercicioInicioInfo = await this.repository.findSessaoExercicioInicio(exercicioId);
        if (exercicioInicioInfo && exercicioInicioInfo.inicio === null) {
            await this.repository.updateSessaoExercicio(exercicioId, { concluido: false, inicio: new Date() });
        }

        await this.repository.replaceSeriesDoExercicio(exercicioId, dados.series);

        return await this.repository.findById(id) as SessaoComDetalhe;
    }

    async finalizarSessao(idParam: string, userId: string): Promise<SessaoComDetalhe & {
        resumo: {
            duracao_minutos: number | null;
            exercicios_concluidos: number;
            exercicios_total: number;
            series_concluidas: number;
            series_total: number;
            volume_total_kg: number;
            tempo_total_isometria_segundos: number;
            distancia_total_metros: number;
            pace_medio_segundos_por_km: number | null;
            taxa_conclusao: number;
        };
    }> {
        const id = sessaoIdSchema.parse(idParam);

        const sessaoStatus = await this.repository.findSessaoStatus(id);
        if (!sessaoStatus) {
            throw new Error('Sessão não encontrada');
        }

        if (sessaoStatus.status !== 'EM_ANDAMENTO') {
            throw new Error('CONFLICT: a sessão já foi finalizada ou cancelada');
        }

        await this._verificarAcessoSessao(userId, sessaoStatus.aluno_id);

        await this.repository.updateStatusFim(id, 'CONCLUIDA');

        const [sessao, resumo] = await Promise.all([
            this.repository.findById(id) as Promise<SessaoComDetalhe>,
            this.repository.getSessaoResumo(id),
        ]);

        // Enviar notificação push (não-bloqueante)
        void (async () => {
            try {
                if (sessao) {
                    const alunoData = await DataBase.select({ 
                            fcm_token: aluno.fcm_token, 
                            nome: user.name,
                            treinador_id: aluno.treinador_id
                        })
                        .from(aluno)
                        .innerJoin(user, eq(aluno.user_id, user.id))
                        .where(eq(aluno.id, sessao.aluno_id))
                        .limit(1);

                    const alunoEncontrado = alunoData[0];
                    if (!alunoEncontrado) return;

                    const fcmTokenAluno = alunoEncontrado.fcm_token;
                    if (fcmTokenAluno && resumo) {
                        await notificarSessaoFinalizada(
                            fcmTokenAluno,
                            sessao.treino_nome ?? 'Treino',
                            resumo.exercicios_concluidos
                        );
                    }

                    // Notificar o treinador, se houver
                    if (alunoEncontrado.treinador_id) {
                        const treinadorData = await DataBase.select({ fcm_token: treinador.fcm_token })
                            .from(treinador)
                            .where(eq(treinador.id, alunoEncontrado.treinador_id))
                            .limit(1);
                        
                        const fcmTokenTreinador = treinadorData[0]?.fcm_token;
                        if (fcmTokenTreinador) {
                            await notificarTreinoConcluidoTreinador(
                                fcmTokenTreinador,
                                alunoEncontrado.nome,
                                sessao.treino_nome ?? 'Treino'
                            );
                        }
                    }
                }
            } catch (e) {
                console.error('[SessaoService] Erro ao enviar notificação de fim:', e);
            }
        })();

        return { ...sessao, resumo: resumo! };
    }

    async cancelarSessao(idParam: string, userId: string): Promise<SessaoComDetalhe> {
        const id = sessaoIdSchema.parse(idParam);

        const sessaoStatus = await this.repository.findSessaoStatus(id);
        if (!sessaoStatus) {
            throw new Error('Sessão não encontrada');
        }

        if (sessaoStatus.status !== 'EM_ANDAMENTO') {
            throw new Error('CONFLICT: a sessão já foi finalizada ou cancelada');
        }

        await this._verificarAcessoSessao(userId, sessaoStatus.aluno_id);

        await this.repository.updateStatusFim(id, 'CANCELADA');

        return await this.repository.findById(id) as SessaoComDetalhe;
    }

    async reordenarExercicios(
        idParam: string,
        body: any,
        userId: string,
    ): Promise<SessaoComDetalhe> {
        const id = sessaoIdSchema.parse(idParam);
        const dados: ReordenarExerciciosInput = reordenarExerciciosSchema.parse(body);

        const sessaoStatus = await this.repository.findSessaoStatus(id);
        if (!sessaoStatus) throw new Error('Sessão não encontrada');
        if (sessaoStatus.status !== 'EM_ANDAMENTO') {
            throw new Error('CONFLICT: apenas sessões em andamento podem ter exercícios reordenados');
        }

        await this._verificarAcessoSessao(userId, sessaoStatus.aluno_id);

        const totalExercicios = await this.repository.contarExerciciosDaSessao(id);
        if (dados.exercicios.length !== totalExercicios) {
            throw new Error(
                `UNPROCESSABLE: a reordenação deve incluir todos os ${totalExercicios} exercício(s) da sessão. Foram enviados ${dados.exercicios.length}.`,
            );
        }

        const ids = dados.exercicios.map((e) => e.sessao_exercicio_id);
        const verificacao = await this.repository.verificarExerciciosDaSessao(id, ids);
        if (!verificacao.validos) {
            throw new Error(`UNPROCESSABLE: exercício(s) não pertencem a esta sessão: ${verificacao.invalidos.join(', ')}`);
        }

        await this.repository.reordenarExercicios(id, dados.exercicios);

        return await this.repository.findById(id) as SessaoComDetalhe;
    }

    async getSessaoResumo(idParam: string, userId: string): Promise<{
        duracao_minutos: number | null;
        exercicios_concluidos: number;
        exercicios_total: number;
        series_concluidas: number;
        series_total: number;
        volume_total_kg: number;
        tempo_total_isometria_segundos: number;
        distancia_total_metros: number;
        pace_medio_segundos_por_km: number | null;
        taxa_conclusao: number;
    }> {
        const id = sessaoIdSchema.parse(idParam);

        const sessao = await this.repository.findById(id);
        if (!sessao) {
            throw new Error('Sessão não encontrada');
        }

        const perfil = await this.usuarioRepository.buscarPerfilAcesso(userId);

        if (!perfil.isAdmin && !perfil.isAluno && !perfil.isTreinador) {
            throw new Error('FORBIDDEN: perfil de acesso não autorizado');
        }

        if (!perfil.isAdmin || perfil.isAluno) {
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
