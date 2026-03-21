import { DataBase } from '../config/DbConnect';
import {
    aluno,
    treino,
    treino_exercicio,
    exercicio,
    exercicio_musculo,
    musculo,
    exercicio_aparelho,
    aparelho,
    treinador,
} from '../config/db/schema';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { type_treino } from '../types/dbSchemas';
import { parseDatabaseError } from '../utils/errors/DatabaseError';
import TreinoFilterBuilder from './filters/TreinoFilterBuilder';
import { TreinoDetalheQuery, TreinoListQuery } from '../utils/validations/treinoValidation';

export interface TreinoExercicioDetalhe {
    id: string;
    series: number;
    repeticoes: string;
    carga_sugerida: string | null;
    tempo_descanso_segundos: number;
    ordem_execucao: number;
    exercicio: {
        id: string;
        nome: string;
        descricao: string | null;
        musculos?: {
            musculo_id: string;
            nome: string;
            grupo_muscular: string;
            tipo_ativacao: 'PRIMARIO' | 'SECUNDARIO';
        }[];
        aparelhos?: {
            aparelho_id: string;
            nome: string;
            descricao: string;
        }[];
    };
}

export interface TreinoComExercicios extends type_treino {
    exercicios: TreinoExercicioDetalhe[];
}

export interface ResultadoPaginadoTreino {
    dados: Array<type_treino | TreinoComExercicios>;
    total: number;
    page: number;
    limite: number;
    totalPages: number;
}

export interface TreinoExercicioPatchInput {
    exercicio_id: string;
    series: number;
    repeticoes: string;
    carga_sugerida?: number | null;
    tempo_descanso_segundos: number;
    ordem_execucao: number;
}

export interface TreinoExercicioUpdateInput {
    id: string;
    series?: number;
    repeticoes?: string;
    carga_sugerida?: number | null;
    tempo_descanso_segundos?: number;
    ordem_execucao?: number;
}

export interface ExercicioResumo {
    id: string;
    aluno_id: string | null;
    deletado_em: Date | null;
}

class TreinoRepository {
    private db: typeof DataBase;

    constructor() {
        this.db = DataBase;
    }

    private formatCargaSugerida(value: number | null | undefined): string | null {
        if (value === null || value === undefined) return null;
        return String(value);
    }

    async create(novoTreino: type_treino): Promise<type_treino> {
        try {
            const [resultado] = await this.db
                .insert(treino)
                .values(novoTreino)
                .returning();

            return resultado as type_treino;
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.create');
        }
    }

    async createComExercicios(novoTreino: type_treino, itens: TreinoExercicioPatchInput[]): Promise<type_treino> {
        try {
            const treinoCriado = await this.db.transaction(async (tx) => {
                const [treinoInserido] = await tx
                    .insert(treino)
                    .values(novoTreino)
                    .returning();

                await tx.insert(treino_exercicio).values(
                    itens.map((item) => ({
                        treino_id: treinoInserido.id,
                        exercicio_id: item.exercicio_id,
                        series: item.series,
                        repeticoes: item.repeticoes,
                        carga_sugerida: this.formatCargaSugerida(item.carga_sugerida),
                        tempo_descanso_segundos: item.tempo_descanso_segundos,
                        ordem_execucao: item.ordem_execucao,
                    })),
                );

                return treinoInserido as type_treino;
            });

            return treinoCriado;
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.createComExercicios');
        }
    }

    async findBaseById(id: string, incluirInativo = false): Promise<type_treino | null> {
        try {
            const condicoes = [eq(treino.id, id)];
            if (!incluirInativo) {
                condicoes.push(isNull(treino.deletado_em));
            }

            const [treinoBase] = await this.db
                .select()
                .from(treino)
                .where(and(...condicoes))
                .limit(1);

            return treinoBase ?? null;
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.findBaseById');
        }
    }

    async verificarAlunoExiste(alunoId: string): Promise<boolean> {
        try {
            const resultado = await this.db
                .select({ id: aluno.id })
                .from(aluno)
                .where(eq(aluno.id, alunoId))
                .limit(1);

            return resultado.length > 0;
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.verificarAlunoExiste');
        }
    }

    async verificarTreinadorExiste(treinadorId: string): Promise<boolean> {
        try {
            const resultado = await this.db
                .select({ id: treinador.id })
                .from(treinador)
                .where(eq(treinador.id, treinadorId))
                .limit(1);

            return resultado.length > 0;
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.verificarTreinadorExiste');
        }
    }

    private async montarExerciciosDoTreino(
        treinoId: string,
        filtros: TreinoDetalheQuery,
    ): Promise<TreinoExercicioDetalhe[]> {
        const filterBuilder = new TreinoFilterBuilder()
            .comTreinoExercicioTreinoId(treinoId)
            .comApenasExerciciosAtivos(filtros.apenas_ativos)
            .comNomeExercicio(filtros.nome_exercicio)
            .comGrupoMuscular(filtros.grupo_muscular)
            .comTipoAtivacao(filtros.tipo_ativacao);

        const itensTreino = await this.db
            .select({
                id: treino_exercicio.id,
                series: treino_exercicio.series,
                repeticoes: treino_exercicio.repeticoes,
                carga_sugerida: treino_exercicio.carga_sugerida,
                tempo_descanso_segundos: treino_exercicio.tempo_descanso_segundos,
                ordem_execucao: treino_exercicio.ordem_execucao,
                exercicio_id: exercicio.id,
                exercicio_nome: exercicio.nome,
                exercicio_descricao: exercicio.descricao,
            })
            .from(treino_exercicio)
            .innerJoin(exercicio, eq(treino_exercicio.exercicio_id, exercicio.id))
            .where(filterBuilder.buildTreinoExercicio())
            .orderBy(
                filtros.ordem_execucao === 'desc'
                    ? desc(treino_exercicio.ordem_execucao)
                    : asc(treino_exercicio.ordem_execucao),
            );

        const exercicioIds = Array.from(new Set(itensTreino.map((item) => item.exercicio_id)));

        let musculosPorExercicio = new Map<string, TreinoExercicioDetalhe['exercicio']['musculos']>();
        if (filtros.incluir_musculos && exercicioIds.length > 0) {
            const musculosDosExercicios = await this.db
                .select({
                    exercicio_id: exercicio_musculo.exercicio_id,
                    musculo_id: musculo.id,
                    nome: musculo.nome,
                    grupo_muscular: musculo.grupo_muscular,
                    tipo_ativacao: exercicio_musculo.tipo_ativacao,
                })
                .from(exercicio_musculo)
                .innerJoin(musculo, eq(exercicio_musculo.musculo_id, musculo.id))
                .where(inArray(exercicio_musculo.exercicio_id, exercicioIds));

            musculosPorExercicio = musculosDosExercicios.reduce(
                (acc, atual) => {
                    const lista = acc.get(atual.exercicio_id) ?? [];
                    lista.push({
                        musculo_id: atual.musculo_id,
                        nome: atual.nome,
                        grupo_muscular: atual.grupo_muscular,
                        tipo_ativacao: atual.tipo_ativacao as 'PRIMARIO' | 'SECUNDARIO',
                    });
                    acc.set(atual.exercicio_id, lista);
                    return acc;
                },
                new Map<string, TreinoExercicioDetalhe['exercicio']['musculos']>(),
            );
        }

        let aparelhosPorExercicio = new Map<string, TreinoExercicioDetalhe['exercicio']['aparelhos']>();
        if (filtros.incluir_aparelhos && exercicioIds.length > 0) {
            const aparelhosDosExercicios = await this.db
                .select({
                    exercicio_id: exercicio_aparelho.exercicio_id,
                    aparelho_id: aparelho.id,
                    nome: aparelho.nome,
                    descricao: aparelho.descricao,
                })
                .from(exercicio_aparelho)
                .innerJoin(aparelho, eq(exercicio_aparelho.aparelho_id, aparelho.id))
                .where(inArray(exercicio_aparelho.exercicio_id, exercicioIds));

            aparelhosPorExercicio = aparelhosDosExercicios.reduce(
                (acc, atual) => {
                    const lista = acc.get(atual.exercicio_id) ?? [];
                    lista.push({
                        aparelho_id: atual.aparelho_id,
                        nome: atual.nome,
                        descricao: atual.descricao,
                    });
                    acc.set(atual.exercicio_id, lista);
                    return acc;
                },
                new Map<string, TreinoExercicioDetalhe['exercicio']['aparelhos']>(),
            );
        }

        return itensTreino.map((item) => ({
            id: item.id,
            series: item.series,
            repeticoes: item.repeticoes,
            carga_sugerida: item.carga_sugerida,
            tempo_descanso_segundos: item.tempo_descanso_segundos,
            ordem_execucao: item.ordem_execucao,
            exercicio: {
                id: item.exercicio_id,
                nome: item.exercicio_nome,
                descricao: item.exercicio_descricao,
                ...(filtros.incluir_musculos
                    ? { musculos: musculosPorExercicio.get(item.exercicio_id) ?? [] }
                    : {}),
                ...(filtros.incluir_aparelhos
                    ? { aparelhos: aparelhosPorExercicio.get(item.exercicio_id) ?? [] }
                    : {}),
            },
        }));
    }

    async findById(id: string, filtros: TreinoDetalheQuery): Promise<TreinoComExercicios | null> {
        try {
            const treinoEncontrado = await this.findBaseById(id, filtros.incluir_treino_inativo);

            if (!treinoEncontrado) {
                return null;
            }

            const exerciciosOrdenados = await this.montarExerciciosDoTreino(id, filtros);

            return {
                ...(treinoEncontrado as type_treino),
                exercicios: exerciciosOrdenados,
            };
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.findById');
        }
    }

    async findAll(
        filtros: TreinoListQuery,
        detalhes: TreinoDetalheQuery,
    ): Promise<ResultadoPaginadoTreino> {
        try {
            const possuiFiltroDeExercicio = Boolean(
                detalhes.nome_exercicio ||
                detalhes.grupo_muscular ||
                detalhes.tipo_ativacao,
            );

            // TODO: N+1 query - quando incluir_exercicios=true, gera 1 query por treino para buscar exercícios.
            // Otimizar com batch query única (treino_id IN [...]) após todas as rotas estarem implementadas.

            const filterBuilder = new TreinoFilterBuilder()
                .comNomeTreino(filtros.nome)
                .comUsuarioId(filtros.usuario_id)
                .comTreinadorId(filtros.treinador_id);

            if (!filtros.incluir_inativos) {
                filterBuilder.apenasTreinosAtivos();
            }

            const baseWhere = filterBuilder.buildTreino();

            let where = baseWhere;

            if (filtros.somente_com_exercicios || possuiFiltroDeExercicio) {
                const subqueryFiltroExercicio = this.db
                    .selectDistinct({ id: treino_exercicio.treino_id })
                    .from(treino_exercicio)
                    .innerJoin(exercicio, eq(treino_exercicio.exercicio_id, exercicio.id))
                    .where(
                        new TreinoFilterBuilder()
                            .comApenasExerciciosAtivos(detalhes.apenas_ativos)
                            .comNomeExercicio(detalhes.nome_exercicio)
                            .comGrupoMuscular(detalhes.grupo_muscular)
                            .comTipoAtivacao(detalhes.tipo_ativacao)
                            .buildTreinoExercicio(),
                    );

                where = and(baseWhere, inArray(treino.id, subqueryFiltroExercicio));
            }

            const offset = (filtros.page - 1) * filtros.limite;

            const [treinos, countResult] = await Promise.all([
                this.db
                    .select()
                    .from(treino)
                    .where(where)
                    .limit(filtros.limite)
                    .offset(offset)
                    .orderBy(
                        filtros.ordem_data_criacao === 'asc'
                            ? asc(treino.data_criacao)
                            : desc(treino.data_criacao),
                    ),
                this.db
                    .select({ count: sql<number>`count(*)` })
                    .from(treino)
                    .where(where),
            ]);

            const total = Number(countResult[0].count);

            if (!filtros.incluir_exercicios) {
                return {
                    dados: treinos as type_treino[],
                    total,
                    page: filtros.page,
                    limite: filtros.limite,
                    totalPages: Math.ceil(total / filtros.limite),
                };
            }

            const treinosComExercicios = await Promise.all(
                treinos.map(async (treinoItem) => ({
                    ...(treinoItem as type_treino),
                    exercicios: await this.montarExerciciosDoTreino(treinoItem.id, detalhes),
                })),
            );

            return {
                dados: treinosComExercicios,
                total,
                page: filtros.page,
                limite: filtros.limite,
                totalPages: Math.ceil(total / filtros.limite),
            };
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.findAll');
        }
    }

    async update(
        id: string,
        treinoData: Partial<Pick<type_treino, 'nome' | 'descricao' | 'treinador_id'>>,
    ): Promise<type_treino | null> {
        try {
            const [treinoAtualizado] = await this.db
                .update(treino)
                .set(treinoData)
                .where(and(eq(treino.id, id), isNull(treino.deletado_em)))
                .returning();

            return treinoAtualizado ?? null;
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.update');
        }
    }

    async findExerciciosByIds(ids: string[]): Promise<ExercicioResumo[]> {
        try {
            if (ids.length === 0) {
                return [];
            }

            const exercicios = await this.db
                .select({
                    id: exercicio.id,
                    aluno_id: exercicio.aluno_id,
                    deletado_em: exercicio.deletado_em,
                })
                .from(exercicio)
                .where(inArray(exercicio.id, ids));

            return exercicios;
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.findExerciciosByIds');
        }
    }

    async findTreinoExercicioIdsByTreino(treinoId: string, treinoExercicioIds: string[]): Promise<string[]> {
        try {
            if (treinoExercicioIds.length === 0) {
                return [];
            }

            const itens = await this.db
                .select({ id: treino_exercicio.id })
                .from(treino_exercicio)
                .where(and(
                    eq(treino_exercicio.treino_id, treinoId),
                    inArray(treino_exercicio.id, treinoExercicioIds),
                ));

            return itens.map((item) => item.id);
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.findTreinoExercicioIdsByTreino');
        }
    }

    async addExerciciosAoTreino(treinoId: string, itens: TreinoExercicioPatchInput[]): Promise<void> {
        try {
            if (itens.length === 0) {
                return;
            }

            await this.db.insert(treino_exercicio).values(
                itens.map((item) => ({
                    treino_id: treinoId,
                    exercicio_id: item.exercicio_id,
                    series: item.series,
                    repeticoes: item.repeticoes,
                    carga_sugerida: this.formatCargaSugerida(item.carga_sugerida),
                    tempo_descanso_segundos: item.tempo_descanso_segundos,
                    ordem_execucao: item.ordem_execucao,
                })),
            );
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.addExerciciosAoTreino');
        }
    }

    async updateExerciciosDoTreino(treinoId: string, atualizacoes: TreinoExercicioUpdateInput[]): Promise<void> {
        try {
            if (atualizacoes.length === 0) {
                return;
            }

            await this.db.transaction(async (tx) => {
                for (const item of atualizacoes) {
                    const payload: Partial<{
                        series: number;
                        repeticoes: string;
                        carga_sugerida: string | null;
                        tempo_descanso_segundos: number;
                        ordem_execucao: number;
                    }> = {};

                    if (item.series !== undefined) payload.series = item.series;
                    if (item.repeticoes !== undefined) payload.repeticoes = item.repeticoes;
                    if (item.carga_sugerida !== undefined) {
                        payload.carga_sugerida = this.formatCargaSugerida(item.carga_sugerida);
                    }
                    if (item.tempo_descanso_segundos !== undefined) payload.tempo_descanso_segundos = item.tempo_descanso_segundos;
                    if (item.ordem_execucao !== undefined) payload.ordem_execucao = item.ordem_execucao;

                    if (Object.keys(payload).length === 0) continue;

                    await tx
                        .update(treino_exercicio)
                        .set(payload)
                        .where(and(
                            eq(treino_exercicio.id, item.id),
                            eq(treino_exercicio.treino_id, treinoId),
                        ));
                }
            });
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.updateExerciciosDoTreino');
        }
    }

    async removeExerciciosDoTreino(treinoId: string, treinoExercicioIds: string[]): Promise<void> {
        try {
            if (treinoExercicioIds.length === 0) {
                return;
            }

            await this.db
                .delete(treino_exercicio)
                .where(and(
                    eq(treino_exercicio.treino_id, treinoId),
                    inArray(treino_exercicio.id, treinoExercicioIds),
                ));
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.removeExerciciosDoTreino');
        }
    }

    async softDelete(id: string): Promise<type_treino> {
        try {
            const [resultado] = await this.db
                .update(treino)
                .set({ deletado_em: new Date() })
                .where(and(eq(treino.id, id), isNull(treino.deletado_em)))
                .returning();

            if (!resultado) {
                throw new Error('Treino não encontrado');
            }

            return resultado as type_treino;
        } catch (error) {
            if (error instanceof Error && error.message === 'Treino não encontrado') {
                throw error;
            }
            throw parseDatabaseError(error, 'TreinoRepository.softDelete');
        }
    }

    async hardDelete(id: string): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                await tx
                    .delete(treino_exercicio)
                    .where(eq(treino_exercicio.treino_id, id));
                await tx
                    .delete(treino)
                    .where(eq(treino.id, id));
            });
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.hardDelete');
        }
    }
}

export default TreinoRepository;
