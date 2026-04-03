import { DataBase } from '../config/DbConnect';
import { eq, and, inArray, asc, desc, sql } from 'drizzle-orm';
import {
    sessao_treino,
    sessao_exercicio,
    sessao_serie,
    treino,
    treino_exercicio,
    exercicio,
    aluno,
} from '../config/db/schema';
import { type_sessao_treino, type_sessao_exercicio, type_sessao_serie } from '../types/dbSchemas';
import { parseDatabaseError } from '../utils/errors/DatabaseError';
import SessaoFilterBuilder from './filters/SessaoFilterBuilder';
import { SessaoListQuery } from '../utils/validations/sessaoValidation';

export interface SessaoSerieDetalhe {
    id: string;
    numero_serie: number;
    repeticoes_realizadas: number | null;
    carga_utilizada: string | null;
    status: 'PENDENTE' | 'CONCLUIDA' | 'PULADA';
    observacoes: string | null;
}

export interface SessaoExercicioDetalhe {
    id: string;
    treino_exercicio_id: string;
    concluido: boolean;
    observacoes: string | null;
    ordem: number;
    inicio: Date | null;
    fim: Date | null;
    exercicio: {
        id: string;
        nome: string;
        descricao: string | null;
    };
    template: {
        series: number;
        repeticoes: string;
        carga_sugerida: string | null;
        tempo_descanso_segundos: number;
        ordem_execucao: number;
    };
    series: SessaoSerieDetalhe[];
}

export interface SessaoComDetalhe extends type_sessao_treino {
    treino_nome: string;
    exercicios: SessaoExercicioDetalhe[];
}

class SessaoRepository {
    private db: typeof DataBase;

    constructor() {
        this.db = DataBase;
    }

    async create(
        novasSessao: type_sessao_treino,
        sessaoExercicios: type_sessao_exercicio[],
        sessaoSeries: type_sessao_serie[],
    ): Promise<string> {
        try {
            const sessaoId = await this.db.transaction(async (tx) => {
                const [sessaoCriada] = await tx
                    .insert(sessao_treino)
                    .values(novasSessao)
                    .returning({ id: sessao_treino.id });

                if (sessaoExercicios.length > 0) {
                    const exerciciosCriados = await tx
                        .insert(sessao_exercicio)
                        .values(sessaoExercicios.map((se) => ({
                            ...se,
                            sessao_treino_id: sessaoCriada.id,
                        })))
                        .returning({ id: sessao_exercicio.id, treino_exercicio_id: sessao_exercicio.treino_exercicio_id });

                    const seriesComId: type_sessao_serie[] = [];
                    for (const ec of exerciciosCriados) {
                        const seriesDeste = sessaoSeries.filter(
                            (s) => s.sessao_exercicio_id === ec.treino_exercicio_id,
                        );
                        for (const serie of seriesDeste) {
                            seriesComId.push({ ...serie, sessao_exercicio_id: ec.id });
                        }
                    }

                    if (seriesComId.length > 0) {
                        await tx.insert(sessao_serie).values(seriesComId);
                    }
                }

                return sessaoCriada.id;
            });

            return sessaoId;
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.create');
        }
    }

    async findById(id: string): Promise<SessaoComDetalhe | null> {
        try {
            const sessaoRows = await this.db
                .select({
                    id: sessao_treino.id,
                    aluno_id: sessao_treino.aluno_id,
                    treino_id: sessao_treino.treino_id,
                    status: sessao_treino.status,
                    inicio: sessao_treino.inicio,
                    fim: sessao_treino.fim,
                    observacoes: sessao_treino.observacoes,
                    treino_nome: treino.nome,
                })
                .from(sessao_treino)
                .innerJoin(treino, eq(sessao_treino.treino_id, treino.id))
                .where(eq(sessao_treino.id, id));

            if (!sessaoRows[0]) return null;

            const sessao = sessaoRows[0];

            const exerciciosRows = await this.db
                .select({
                    sessao_exercicio_id: sessao_exercicio.id,
                    treino_exercicio_id: sessao_exercicio.treino_exercicio_id,
                    concluido: sessao_exercicio.concluido,
                    sessao_exercicio_observacoes: sessao_exercicio.observacoes,
                    sessao_exercicio_ordem: sessao_exercicio.ordem,
                    sessao_exercicio_inicio: sessao_exercicio.inicio,
                    sessao_exercicio_fim: sessao_exercicio.fim,
                    te_series: treino_exercicio.series,
                    te_repeticoes: treino_exercicio.repeticoes,
                    te_carga_sugerida: treino_exercicio.carga_sugerida,
                    te_tempo_descanso_segundos: treino_exercicio.tempo_descanso_segundos,
                    te_ordem_execucao: treino_exercicio.ordem_execucao,
                    exercicio_id: exercicio.id,
                    exercicio_nome: exercicio.nome,
                    exercicio_descricao: exercicio.descricao,
                })
                .from(sessao_exercicio)
                .innerJoin(treino_exercicio, eq(sessao_exercicio.treino_exercicio_id, treino_exercicio.id))
                .innerJoin(exercicio, eq(treino_exercicio.exercicio_id, exercicio.id))
                .where(eq(sessao_exercicio.sessao_treino_id, id))
                .orderBy(sessao_exercicio.ordem);

            const exercicioIds = exerciciosRows.map((r) => r.sessao_exercicio_id);

            const seriesRows = exercicioIds.length > 0
                ? await this.db
                    .select()
                    .from(sessao_serie)
                    .where(inArray(sessao_serie.sessao_exercicio_id, exercicioIds))
                    .orderBy(sessao_serie.numero_serie)
                : [];

            // Agrupa séries por sessao_exercicio_id
            const seriesPorExercicio = new Map<string, SessaoSerieDetalhe[]>();
            for (const sr of seriesRows) {
                const lista = seriesPorExercicio.get(sr.sessao_exercicio_id) ?? [];
                lista.push({
                    id: sr.id,
                    numero_serie: sr.numero_serie,
                    repeticoes_realizadas: sr.repeticoes_realizadas,
                    carga_utilizada: sr.carga_utilizada,
                    status: sr.status as 'PENDENTE' | 'CONCLUIDA' | 'PULADA',
                    observacoes: sr.observacoes,
                });
                seriesPorExercicio.set(sr.sessao_exercicio_id, lista);
            }

            const exercicios: SessaoExercicioDetalhe[] = exerciciosRows.map((r) => ({
                id: r.sessao_exercicio_id,
                treino_exercicio_id: r.treino_exercicio_id,
                concluido: r.concluido,
                observacoes: r.sessao_exercicio_observacoes,
                ordem: r.sessao_exercicio_ordem,
                inicio: r.sessao_exercicio_inicio,
                fim: r.sessao_exercicio_fim,
                exercicio: {
                    id: r.exercicio_id,
                    nome: r.exercicio_nome,
                    descricao: r.exercicio_descricao,
                },
                template: {
                    series: r.te_series,
                    repeticoes: r.te_repeticoes,
                    carga_sugerida: r.te_carga_sugerida,
                    tempo_descanso_segundos: r.te_tempo_descanso_segundos,
                    ordem_execucao: r.te_ordem_execucao,
                },
                series: seriesPorExercicio.get(r.sessao_exercicio_id) ?? [],
            }));

            return {
                id: sessao.id,
                aluno_id: sessao.aluno_id,
                treino_id: sessao.treino_id,
                status: sessao.status as 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA',
                inicio: sessao.inicio,
                fim: sessao.fim,
                observacoes: sessao.observacoes,
                treino_nome: sessao.treino_nome,
                exercicios,
            };
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.findById');
        }
    }

    async verificarSessaoEmAndamento(alunoId: string): Promise<boolean> {
        try {
            const resultado = await this.db
                .select({ id: sessao_treino.id })
                .from(sessao_treino)
                .where(
                    and(
                        eq(sessao_treino.aluno_id, alunoId),
                        eq(sessao_treino.status, 'EM_ANDAMENTO'),
                    ),
                )
                .limit(1);

            return resultado.length > 0;
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.verificarSessaoEmAndamento');
        }
    }

    async findAll(
        filtros: SessaoListQuery,
        alunoIds?: string[],
    ): Promise<{ dados: Omit<SessaoComDetalhe, 'exercicios'>[]; total: number; page: number; limite: number; totalPages: number }> {
        try {
            const builder = new SessaoFilterBuilder()
                .comTreinoId(filtros.treino_id)
                .comStatus(filtros.status as 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA' | undefined)
                .comDataInicio(filtros.data_inicio)
                .comDataFim(filtros.data_fim);

            if (alunoIds !== undefined) {
                builder.comAlunoIds(alunoIds);
            } else if (filtros.aluno_id) {
                builder.comAlunoId(filtros.aluno_id);
            }

            const where = builder.build();
            const offset = (filtros.page - 1) * filtros.limite;

            const [sessoes, countResult] = await Promise.all([
                this.db
                    .select({
                        id: sessao_treino.id,
                        aluno_id: sessao_treino.aluno_id,
                        treino_id: sessao_treino.treino_id,
                        status: sessao_treino.status,
                        inicio: sessao_treino.inicio,
                        fim: sessao_treino.fim,
                        observacoes: sessao_treino.observacoes,
                        treino_nome: treino.nome,
                    })
                    .from(sessao_treino)
                    .innerJoin(treino, eq(sessao_treino.treino_id, treino.id))
                    .where(where)
                    .limit(filtros.limite)
                    .offset(offset)
                    .orderBy(
                        filtros.ordem_data_inicio === 'asc'
                            ? asc(sessao_treino.inicio)
                            : desc(sessao_treino.inicio),
                    ),
                this.db
                    .select({ count: sql<number>`count(*)` })
                    .from(sessao_treino)
                    .where(where),
            ]);

            const total = Number(countResult[0].count);

            return {
                dados: sessoes.map((s) => ({
                    id: s.id,
                    aluno_id: s.aluno_id,
                    treino_id: s.treino_id,
                    status: s.status as 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA',
                    inicio: s.inicio,
                    fim: s.fim,
                    observacoes: s.observacoes,
                    treino_nome: s.treino_nome,
                })),
                total,
                page: filtros.page,
                limite: filtros.limite,
                totalPages: Math.ceil(total / filtros.limite),
            };
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.findAll');
        }
    }

    async findEmAndamento(alunoId: string): Promise<SessaoComDetalhe | null> {
        try {
            const rows = await this.db
                .select({ id: sessao_treino.id })
                .from(sessao_treino)
                .where(
                    and(
                        eq(sessao_treino.aluno_id, alunoId),
                        eq(sessao_treino.status, 'EM_ANDAMENTO'),
                    ),
                )
                .limit(1);

            if (!rows[0]) return null;

            return this.findById(rows[0].id);
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.findEmAndamento');
        }
    }

    async getSessaoResumo(id: string): Promise<{
        duracao_minutos: number | null;
        exercicios_concluidos: number;
        exercicios_total: number;
        series_concluidas: number;
        series_total: number;
        volume_total_kg: number;
        taxa_conclusao: number;
    } | null> {
        try {
            const sessaoRows = await this.db
                .select({
                    status: sessao_treino.status,
                    inicio: sessao_treino.inicio,
                    fim: sessao_treino.fim,
                })
                .from(sessao_treino)
                .where(eq(sessao_treino.id, id))
                .limit(1);

            if (!sessaoRows[0]) return null;

            const sessao = sessaoRows[0];

            const fimEfetivo = sessao.fim ?? new Date();
            const duracao_minutos = sessao.status === 'EM_ANDAMENTO' && !sessao.fim
                ? null
                : Math.round((fimEfetivo.getTime() - sessao.inicio.getTime()) / 60000);

            const exerciciosRows = await this.db
                .select({
                    id: sessao_exercicio.id,
                    concluido: sessao_exercicio.concluido,
                })
                .from(sessao_exercicio)
                .where(eq(sessao_exercicio.sessao_treino_id, id));

            const exercicios_total = exerciciosRows.length;
            const exercicios_concluidos = exerciciosRows.filter((e) => e.concluido).length;

            const exercicioIds = exerciciosRows.map((e) => e.id);

            const seriesRows = exercicioIds.length > 0
                ? await this.db
                    .select({
                        status: sessao_serie.status,
                        repeticoes_realizadas: sessao_serie.repeticoes_realizadas,
                        carga_utilizada: sessao_serie.carga_utilizada,
                    })
                    .from(sessao_serie)
                    .where(inArray(sessao_serie.sessao_exercicio_id, exercicioIds))
                : [];

            const series_total = seriesRows.length;
            const series_concluidas = seriesRows.filter((s) => s.status === 'CONCLUIDA').length;

            const volume_total_kg = seriesRows.reduce((acc, s) => {
                if (s.status === 'CONCLUIDA' && s.carga_utilizada && s.repeticoes_realizadas) {
                    return acc + parseFloat(s.carga_utilizada) * s.repeticoes_realizadas;
                }
                return acc;
            }, 0);

            const taxa_conclusao = series_total > 0
                ? Math.round((series_concluidas / series_total) * 100)
                : 0;

            return {
                duracao_minutos,
                exercicios_concluidos,
                exercicios_total,
                series_concluidas,
                series_total,
                volume_total_kg: Math.round(volume_total_kg * 100) / 100,
                taxa_conclusao,
            };
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.getSessaoResumo');
        }
    }

    async replaceSeriesDoExercicio(
        sessaoExercicioId: string,
        series: {
            numero_serie: number;
            repeticoes_realizadas?: number | null;
            carga_utilizada?: string | null;
            status: 'PENDENTE' | 'CONCLUIDA' | 'PULADA';
            observacoes?: string | null;
        }[],
    ): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                await tx
                    .delete(sessao_serie)
                    .where(eq(sessao_serie.sessao_exercicio_id, sessaoExercicioId));

                if (series.length > 0) {
                    await tx.insert(sessao_serie).values(
                        series.map((s) => ({ ...s, sessao_exercicio_id: sessaoExercicioId })),
                    );
                }
            });
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.replaceSeriesDoExercicio');
        }
    }

    async updateStatusFim(id: string, status: 'CONCLUIDA' | 'CANCELADA'): Promise<void> {
        try {
            await this.db
                .update(sessao_treino)
                .set({ status, fim: new Date() })
                .where(eq(sessao_treino.id, id));
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.updateStatusFim');
        }
    }

    async findSessaoStatus(id: string): Promise<{ status: string; aluno_id: string } | null> {
        try {
            const rows = await this.db
                .select({ status: sessao_treino.status, aluno_id: sessao_treino.aluno_id })
                .from(sessao_treino)
                .where(eq(sessao_treino.id, id))
                .limit(1);

            return rows[0] ?? null;
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.findSessaoStatus');
        }
    }

    async updateObservacoes(id: string, observacoes: string): Promise<void> {
        try {
            await this.db
                .update(sessao_treino)
                .set({ observacoes })
                .where(eq(sessao_treino.id, id));
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.updateObservacoes');
        }
    }

    async updateSessaoExercicio(
        sessaoExercicioId: string,
        dados: { concluido: boolean; observacoes?: string | null; inicio?: Date | null; fim?: Date | null },
    ): Promise<void> {
        try {
            await this.db
                .update(sessao_exercicio)
                .set(dados)
                .where(eq(sessao_exercicio.id, sessaoExercicioId));
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.updateSessaoExercicio');
        }
    }

    async findSessaoExercicioInicio(sessaoExercicioId: string): Promise<{ inicio: Date | null } | null> {
        try {
            const rows = await this.db
                .select({ inicio: sessao_exercicio.inicio })
                .from(sessao_exercicio)
                .where(eq(sessao_exercicio.id, sessaoExercicioId))
                .limit(1);
            return rows[0] ?? null;
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.findSessaoExercicioInicio');
        }
    }

    async findSessaoExercicio(sessaoId: string, exercicioId: string): Promise<{ id: string; sessao_treino_id: string } | null> {
        try {
            const rows = await this.db
                .select({ id: sessao_exercicio.id, sessao_treino_id: sessao_exercicio.sessao_treino_id })
                .from(sessao_exercicio)
                .where(
                    and(
                        eq(sessao_exercicio.sessao_treino_id, sessaoId),
                        eq(sessao_exercicio.id, exercicioId),
                    ),
                )
                .limit(1);

            return rows[0] ?? null;
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.findSessaoExercicio');
        }
    }

    async reordenarExercicios(
        sessaoId: string,
        itens: { sessao_exercicio_id: string; ordem: number }[],
    ): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                for (const item of itens) {
                    await tx
                        .update(sessao_exercicio)
                        .set({ ordem: item.ordem })
                        .where(and(
                            eq(sessao_exercicio.id, item.sessao_exercicio_id),
                            eq(sessao_exercicio.sessao_treino_id, sessaoId),
                        ));
                }
            });
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.reordenarExercicios');
        }
    }

    async contarExerciciosDaSessao(sessaoId: string): Promise<number> {
        try {
            const resultado = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(sessao_exercicio)
                .where(eq(sessao_exercicio.sessao_treino_id, sessaoId));
            return Number(resultado[0].count);
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.contarExerciciosDaSessao');
        }
    }

    async verificarExerciciosDaSessao(sessaoId: string, ids: string[]): Promise<{ validos: boolean; invalidos: string[] }> {
        try {
            const encontrados = await this.db
                .select({ id: sessao_exercicio.id })
                .from(sessao_exercicio)
                .where(and(
                    eq(sessao_exercicio.sessao_treino_id, sessaoId),
                    inArray(sessao_exercicio.id, ids),
                ));
            const idsEncontrados = new Set(encontrados.map((e) => e.id));
            const invalidos = ids.filter((id) => !idsEncontrados.has(id));
            return { validos: invalidos.length === 0, invalidos };
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.verificarExerciciosDaSessao');
        }
    }

    async buscarAlunosDoTreinador(treinadorId: string): Promise<string[]> {
        try {
            const rows = await this.db
                .select({ aluno_id: aluno.id })
                .from(aluno)
                .where(eq(aluno.treinador_id, treinadorId));

            return [...new Set(rows.map((r) => r.aluno_id))];
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.buscarAlunosDoTreinador');
        }
    }

    async buscarTreinoComExercicios(treinoId: string, alunoId: string): Promise<{
        treino_id: string;
        exercicios: { treino_exercicio_id: string; series: number; ordem_execucao: number }[];
    } | null> {
        try {
            const treinoResult = await this.db
                .select({ id: treino.id })
                .from(treino)
                .where(
                    and(
                        eq(treino.id, treinoId),
                        eq(treino.usuario_id, alunoId),
                    ),
                )
                .limit(1);

            if (!treinoResult[0]) return null;

            const exerciciosResult = await this.db
                .select({
                    treino_exercicio_id: treino_exercicio.id,
                    series: treino_exercicio.series,
                    ordem_execucao: treino_exercicio.ordem_execucao,
                })
                .from(treino_exercicio)
                .where(eq(treino_exercicio.treino_id, treinoId))
                .orderBy(treino_exercicio.ordem_execucao);

            return {
                treino_id: treinoResult[0].id,
                exercicios: exerciciosResult,
            };
        } catch (error) {
            throw parseDatabaseError(error, 'SessaoRepository.buscarTreinoComExercicios');
        }
    }
}

export default SessaoRepository;
