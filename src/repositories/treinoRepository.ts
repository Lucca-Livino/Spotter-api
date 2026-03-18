import { DataBase } from '../config/DbConnect';
import {
    aluno,
    treinador,
    treino,
    treino_exercicio,
    exercicio,
    exercicio_musculo,
    musculo,
    exercicio_aparelho,
    aparelho,
} from '../config/db/schema';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { type_treino } from '../types/dbSchemas';
import { parseDatabaseError } from '../utils/errors/DatabaseError';
import TreinoFilterBuilder from './filters/TreinoFilterBuilder';
import { TreinoDetalheQuery, TreinoListQuery } from '../utils/validations/treinoValidation';

export interface PerfilAcessoTreino {
    alunoId: string | null;
    treinadorId: string | null;
    isAluno: boolean;
    isTreinador: boolean;
    isAdmin: boolean;
}

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

class TreinoRepository {
    private db: typeof DataBase;

    constructor() {
        this.db = DataBase;
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

    async buscarPerfilAcesso(userId: string): Promise<PerfilAcessoTreino> {
        try {
            const [treinadorResult, alunoResult] = await Promise.all([
                this.db
                    .select({ id: treinador.id, is_admin: treinador.is_admin })
                    .from(treinador)
                    .where(eq(treinador.user_id, userId))
                    .limit(1),
                this.db
                    .select({ id: aluno.id, is_admin: aluno.is_admin })
                    .from(aluno)
                    .where(eq(aluno.user_id, userId))
                    .limit(1),
            ]);

            const isAluno = Boolean(alunoResult[0]);
            const isTreinador = Boolean(treinadorResult[0]);
            const isAdmin =
                treinadorResult[0]?.is_admin === true ||
                alunoResult[0]?.is_admin === true;

            return {
                alunoId: alunoResult[0]?.id ?? null,
                treinadorId: treinadorResult[0]?.id ?? null,
                isAluno,
                isTreinador,
                isAdmin,
            };
        } catch (error) {
            throw parseDatabaseError(error, 'TreinoRepository.buscarPerfilAcesso');
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
            const filterBuilder = new TreinoFilterBuilder()
                .comTreinoId(id)
                .apenasTreinosAtivos();

            const [treinoEncontrado] = await this.db
                .select()
                .from(treino)
                .where(filterBuilder.buildTreino())
                .limit(1);

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

            const baseWhere = new TreinoFilterBuilder()
                .apenasTreinosAtivos()
                .comNomeTreino(filtros.nome)
                .comUsuarioId(filtros.usuario_id)
                .comTreinadorId(filtros.treinador_id)
                .buildTreino();

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
}

export default TreinoRepository;
