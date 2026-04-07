import { DataBase } from '../config/DbConnect';
import { eq, and, gte, lte, inArray, asc, desc, sql } from 'drizzle-orm';
import {
    sessao_treino,
    sessao_exercicio,
    sessao_serie,
    treino,
    treino_exercicio,
    exercicio,
    exercicio_musculo,
    musculo,
    aluno,
} from '../config/db/schema';
import { parseDatabaseError } from '../utils/errors/DatabaseError';

export interface EstatisticasHistorico {
    total_sessoes: number;
    sessoes_concluidas: number;
    sessoes_canceladas: number;
    tempo_total_minutos: number;
    media_duracao_minutos: number;
    volume_total_kg: number;
    sequencia_atual: number;
    melhor_sequencia: number;
    treinos_por_semana_media: number;
}

export interface ProgressaoItem {
    data: Date;
    sessao_id: string;
    maior_carga: number | null;
    media_repeticoes: number | null;
    volume_total: number;
}

export interface GrupoMuscularItem {
    grupo_muscular: string;
    total_series: number;
    volume_total_kg: number;
    percentual: number;
}

export interface ExercicioFrequenteItem {
    exercicio_id: string;
    nome: string;
    total_sessoes: number;
    total_series: number;
    volume_total_kg: number;
}

class HistoricoRepository {
    private db: typeof DataBase;

    constructor() {
        this.db = DataBase;
    }

    async getEstatisticas(
        alunoId: string,
        dataInicio?: string,
        dataFim?: string,
    ): Promise<EstatisticasHistorico> {
        try {
            // 1. Sessões do período
            const sessoes = await this.db
                .select({
                    id: sessao_treino.id,
                    status: sessao_treino.status,
                    inicio: sessao_treino.inicio,
                    fim: sessao_treino.fim,
                })
                .from(sessao_treino)
                .where(
                    and(
                        eq(sessao_treino.aluno_id, alunoId),
                        dataInicio ? gte(sessao_treino.inicio, new Date(dataInicio)) : undefined,
                        dataFim ? lte(sessao_treino.inicio, new Date(dataFim)) : undefined,
                    ),
                );

            const total_sessoes = sessoes.length;
            const sessoes_concluidas = sessoes.filter((s) => s.status === 'CONCLUIDA').length;
            const sessoes_canceladas = sessoes.filter((s) => s.status === 'CANCELADA').length;

            // 2. Duração (apenas sessões CONCLUIDAS com fim registrado)
            const sessoesComDuracao = sessoes.filter((s) => s.status === 'CONCLUIDA' && s.fim);
            const tempo_total_minutos = sessoesComDuracao.reduce((acc, s) => {
                return acc + Math.round((s.fim!.getTime() - s.inicio.getTime()) / 60000);
            }, 0);
            const media_duracao_minutos = sessoesComDuracao.length > 0
                ? Math.round(tempo_total_minutos / sessoesComDuracao.length)
                : 0;

            // 3. Volume total: séries CONCLUIDAS nas sessões do período
            const sessaoIds = sessoes.map((s) => s.id);
            let volume_total_kg = 0;

            if (sessaoIds.length > 0) {
                const seriesRows = await this.db
                    .select({
                        carga_utilizada: sessao_serie.carga_utilizada,
                        repeticoes_realizadas: sessao_serie.repeticoes_realizadas,
                    })
                    .from(sessao_serie)
                    .innerJoin(sessao_exercicio, eq(sessao_serie.sessao_exercicio_id, sessao_exercicio.id))
                    .where(
                        and(
                            inArray(sessao_exercicio.sessao_treino_id, sessaoIds),
                            eq(sessao_serie.status, 'CONCLUIDA'),
                        ),
                    );

                volume_total_kg = seriesRows.reduce((acc, s) => {
                    if (s.carga_utilizada && s.repeticoes_realizadas) {
                        return acc + parseFloat(s.carga_utilizada) * s.repeticoes_realizadas;
                    }
                    return acc;
                }, 0);
            }

            // 4. Streaks — calculados sobre TODO o histórico 
            const todasConcluidas = await this.db
                .select({ inicio: sessao_treino.inicio })
                .from(sessao_treino)
                .where(
                    and(
                        eq(sessao_treino.aluno_id, alunoId),
                        eq(sessao_treino.status, 'CONCLUIDA'),
                    ),
                )
                .orderBy(desc(sessao_treino.inicio));

            const { sequencia_atual, melhor_sequencia } = calcularSequencias(
                todasConcluidas.map((s) => s.inicio),
            );

            // 5. Treinos por semana (baseado no período filtrado)
            let treinos_por_semana_media = 0;
            if (sessoes_concluidas > 0) {
                const dataInicioEfetiva = dataInicio
                    ? new Date(dataInicio)
                    : sessoes.reduce((min, s) => (s.inicio < min ? s.inicio : min), sessoes[0].inicio);
                const dataFimEfetiva = dataFim ? new Date(dataFim) : new Date();
                const dias = Math.max(1, (dataFimEfetiva.getTime() - dataInicioEfetiva.getTime()) / (1000 * 60 * 60 * 24));
                const semanas = dias / 7;
                treinos_por_semana_media = Math.round((sessoes_concluidas / semanas) * 10) / 10;
            }

            return {
                total_sessoes,
                sessoes_concluidas,
                sessoes_canceladas,
                tempo_total_minutos,
                media_duracao_minutos,
                volume_total_kg: Math.round(volume_total_kg * 100) / 100,
                sequencia_atual,
                melhor_sequencia,
                treinos_por_semana_media,
            };
        } catch (error) {
            throw parseDatabaseError(error, 'HistoricoRepository.getEstatisticas');
        }
    }

    async getProgressao(
        alunoId: string,
        exercicioId: string,
        dataInicio?: string,
        dataFim?: string,
        limite: number = 50,
    ): Promise<ProgressaoItem[]> {
        try {
            const rows = await this.db
                .select({
                    sessao_id: sessao_treino.id,
                    data: sessao_treino.inicio,
                    maior_carga: sql<string | null>`max(${sessao_serie.carga_utilizada})`,
                    media_repeticoes: sql<string | null>`avg(${sessao_serie.repeticoes_realizadas})`,
                    volume_total: sql<string>`coalesce(sum(
                        case
                            when ${sessao_serie.carga_utilizada} is not null
                             and ${sessao_serie.repeticoes_realizadas} is not null
                            then ${sessao_serie.carga_utilizada}::numeric * ${sessao_serie.repeticoes_realizadas}
                            else 0
                        end
                    ), 0)`,
                })
                .from(sessao_treino)
                .innerJoin(sessao_exercicio, eq(sessao_exercicio.sessao_treino_id, sessao_treino.id))
                .innerJoin(treino_exercicio, eq(sessao_exercicio.treino_exercicio_id, treino_exercicio.id))
                .innerJoin(sessao_serie, eq(sessao_serie.sessao_exercicio_id, sessao_exercicio.id))
                .where(
                    and(
                        eq(sessao_treino.aluno_id, alunoId),
                        eq(treino_exercicio.exercicio_id, exercicioId),
                        eq(sessao_treino.status, 'CONCLUIDA'),
                        eq(sessao_serie.status, 'CONCLUIDA'),
                        dataInicio ? gte(sessao_treino.inicio, new Date(dataInicio)) : undefined,
                        dataFim ? lte(sessao_treino.inicio, new Date(dataFim)) : undefined,
                    ),
                )
                .groupBy(sessao_treino.id, sessao_treino.inicio)
                .orderBy(desc(sessao_treino.inicio))
                .limit(limite);

            return rows.map((r) => ({
                data: r.data,
                sessao_id: r.sessao_id,
                maior_carga: r.maior_carga !== null ? Math.round(parseFloat(r.maior_carga) * 100) / 100 : null,
                media_repeticoes: r.media_repeticoes !== null ? Math.round(parseFloat(r.media_repeticoes) * 10) / 10 : null,
                volume_total: Math.round(parseFloat(r.volume_total) * 100) / 100,
            }));
        } catch (error) {
            throw parseDatabaseError(error, 'HistoricoRepository.getProgressao');
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
            throw parseDatabaseError(error, 'HistoricoRepository.buscarAlunosDoTreinador');
        }
    }

    async getGruposMusculares(
        alunoId: string,
        dataInicio?: string,
        dataFim?: string,
    ): Promise<GrupoMuscularItem[]> {
        try {
            const rows = await this.db
                .select({
                    grupo_muscular: musculo.grupo_muscular,
                    total_series: sql<string>`count(${sessao_serie.id})`,
                    volume_total_kg: sql<string>`coalesce(sum(
                        case
                            when ${sessao_serie.carga_utilizada} is not null
                             and ${sessao_serie.repeticoes_realizadas} is not null
                            then ${sessao_serie.carga_utilizada}::numeric * ${sessao_serie.repeticoes_realizadas}
                            else 0
                        end
                    ), 0)`,
                })
                .from(sessao_treino)
                .innerJoin(sessao_exercicio, eq(sessao_exercicio.sessao_treino_id, sessao_treino.id))
                .innerJoin(treino_exercicio, eq(sessao_exercicio.treino_exercicio_id, treino_exercicio.id))
                .innerJoin(exercicio, eq(treino_exercicio.exercicio_id, exercicio.id))
                .innerJoin(exercicio_musculo, eq(exercicio_musculo.exercicio_id, exercicio.id))
                .innerJoin(musculo, eq(exercicio_musculo.musculo_id, musculo.id))
                .innerJoin(sessao_serie, eq(sessao_serie.sessao_exercicio_id, sessao_exercicio.id))
                .where(
                    and(
                        eq(sessao_treino.aluno_id, alunoId),
                        eq(sessao_treino.status, 'CONCLUIDA'),
                        eq(sessao_serie.status, 'CONCLUIDA'),
                        dataInicio ? gte(sessao_treino.inicio, new Date(dataInicio)) : undefined,
                        dataFim ? lte(sessao_treino.inicio, new Date(dataFim)) : undefined,
                    ),
                )
                .groupBy(musculo.grupo_muscular)
                .orderBy(desc(sql`count(${sessao_serie.id})`), asc(musculo.grupo_muscular));

            const totalSeries = rows.reduce((acc, r) => acc + Number(r.total_series), 0);

            return rows.map((r) => ({
                grupo_muscular: r.grupo_muscular,
                total_series: Number(r.total_series),
                volume_total_kg: Math.round(parseFloat(r.volume_total_kg) * 100) / 100,
                percentual: totalSeries > 0 ? Math.round((Number(r.total_series) / totalSeries) * 1000) / 10 : 0,
            }));
        } catch (error) {
            throw parseDatabaseError(error, 'HistoricoRepository.getGruposMusculares');
        }
    }

    async getExerciciosFrequentes(
        alunoId: string,
        dataInicio?: string,
        dataFim?: string,
        limite: number = 10,
    ): Promise<ExercicioFrequenteItem[]> {
        try {
            const rows = await this.db
                .select({
                    exercicio_id: exercicio.id,
                    nome: exercicio.nome,
                    total_sessoes: sql<string>`count(distinct ${sessao_treino.id})`,
                    total_series: sql<string>`count(${sessao_serie.id})`,
                    volume_total_kg: sql<string>`coalesce(sum(
                        case
                            when ${sessao_serie.carga_utilizada} is not null
                             and ${sessao_serie.repeticoes_realizadas} is not null
                            then ${sessao_serie.carga_utilizada}::numeric * ${sessao_serie.repeticoes_realizadas}
                            else 0
                        end
                    ), 0)`,
                })
                .from(sessao_treino)
                .innerJoin(sessao_exercicio, eq(sessao_exercicio.sessao_treino_id, sessao_treino.id))
                .innerJoin(treino_exercicio, eq(sessao_exercicio.treino_exercicio_id, treino_exercicio.id))
                .innerJoin(exercicio, eq(treino_exercicio.exercicio_id, exercicio.id))
                .innerJoin(sessao_serie, eq(sessao_serie.sessao_exercicio_id, sessao_exercicio.id))
                .where(
                    and(
                        eq(sessao_treino.aluno_id, alunoId),
                        eq(sessao_treino.status, 'CONCLUIDA'),
                        eq(sessao_serie.status, 'CONCLUIDA'),
                        dataInicio ? gte(sessao_treino.inicio, new Date(dataInicio)) : undefined,
                        dataFim ? lte(sessao_treino.inicio, new Date(dataFim)) : undefined,
                    ),
                )
                .groupBy(exercicio.id, exercicio.nome)
                .orderBy(desc(sql`count(distinct ${sessao_treino.id})`), asc(exercicio.nome))
                .limit(limite);

            return rows.map((r) => ({
                exercicio_id: r.exercicio_id,
                nome: r.nome,
                total_sessoes: Number(r.total_sessoes),
                total_series: Number(r.total_series),
                volume_total_kg: Math.round(parseFloat(r.volume_total_kg) * 100) / 100,
            }));
        } catch (error) {
            throw parseDatabaseError(error, 'HistoricoRepository.getExerciciosFrequentes');
        }
    }
}

/**
 * Calcula sequencia_atual e melhor_sequencia a partir de um array de datas de sessões.
 * - sequencia_atual: dias consecutivos a partir de hoje ou ontem
 * - melhor_sequencia: maior streak histórico
 */
function calcularSequencias(datas: Date[]): { sequencia_atual: number; melhor_sequencia: number } {
    if (datas.length === 0) return { sequencia_atual: 0, melhor_sequencia: 0 };

    const diasUnicos = [...new Set(datas.map((d) => d.toISOString().slice(0, 10)))].sort();

    // Melhor sequência histórica
    let melhor = 1;
    let contagem = 1;
    for (let i = 1; i < diasUnicos.length; i++) {
        const prev = new Date(diasUnicos[i - 1]);
        const curr = new Date(diasUnicos[i]);
        const diffDias = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDias === 1) {
            contagem++;
            if (contagem > melhor) melhor = contagem;
        } else {
            contagem = 1;
        }
    }

    // Sequência atual: verifica se o último treino foi hoje ou ontem
    const hoje = new Date().toISOString().slice(0, 10);
    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const ultimoDia = diasUnicos[diasUnicos.length - 1];

    if (ultimoDia !== hoje && ultimoDia !== ontem) {
        return { sequencia_atual: 0, melhor_sequencia: melhor };
    }

    let sequencia_atual = 1;
    for (let i = diasUnicos.length - 2; i >= 0; i--) {
        const curr = new Date(diasUnicos[i + 1]);
        const prev = new Date(diasUnicos[i]);
        const diffDias = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDias === 1) {
            sequencia_atual++;
        } else {
            break;
        }
    }

    return { sequencia_atual, melhor_sequencia: melhor };
}

export default HistoricoRepository;
