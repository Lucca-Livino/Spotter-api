import { DataBase } from '../config/DbConnect';
import { eq, and, inArray } from 'drizzle-orm';
import {
    sessao_treino,
    sessao_exercicio,
    sessao_serie,
    treino,
    treino_exercicio,
    exercicio,
} from '../config/db/schema';
import { type_sessao_treino, type_sessao_exercicio, type_sessao_serie } from '../types/dbSchemas';
import { parseDatabaseError } from '../utils/errors/DatabaseError';

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
                .orderBy(treino_exercicio.ordem_execucao);

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

    async buscarTreinoComExercicios(treinoId: string, alunoId: string): Promise<{
        treino_id: string;
        exercicios: { treino_exercicio_id: string; series: number }[];
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
