import { DataBase } from "../config/DbConnect";
import { eq, and, isNull, inArray, sql, asc, desc } from "drizzle-orm";
import { exercicio, exercicio_musculo, musculo, aluno, treino_exercicio } from "../config/db/schema";
import { type_exercicio } from "../types/dbSchemas";
import { ExercicioComMusculos, FiltrosExercicio, MusculoResumo, ResultadoPaginadoExercicio } from "../types/filters";
import { parseDatabaseError } from "../utils/errors/DatabaseError";
import ExercicioFilterBuilder from "./filters/ExercicioFilterBuilder";

class ExercicioRepository {
    private db: typeof DataBase;
    constructor() {
        this.db = DataBase;
    }

    async createExercicio(
        novoExercicio: type_exercicio,
        musculos: { musculo_id: string; tipo_ativacao: 'PRIMARIO' | 'SECUNDARIO' }[],
    ): Promise<type_exercicio> {
        try {
            const resultado = await this.db.transaction(async (tx) => {
                const [exercicioCriado] = await tx
                    .insert(exercicio)
                    .values(novoExercicio)
                    .returning();

                if (musculos.length > 0) {
                    await tx.insert(exercicio_musculo).values(
                        musculos.map((m) => ({
                            exercicio_id: exercicioCriado.id,
                            musculo_id: m.musculo_id,
                            tipo_ativacao: m.tipo_ativacao,
                        })),
                    );
                }

                return exercicioCriado;
            });
            return resultado;
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.createExercicio');
        }
    }

    async getAllExercicios(
        filtros: FiltrosExercicio,
        page: number,
        limite: number,
        incluirMusculos: boolean,
    ): Promise<ResultadoPaginadoExercicio> {
        try {
            const filterBuilder = new ExercicioFilterBuilder()
                .comNome(filtros.nome)
                .comEscopo(filtros.escopo, filtros.aluno_id)
                .comEmUso(filtros.em_uso)
                .comGrupoMuscular(filtros.grupo_muscular)
                .comTipoAtivacao(filtros.tipo_ativacao);

            if (!filtros.incluir_inativos) {
                filterBuilder.apenasAtivos();
            }

            const where = filterBuilder.build();

            const offset = (page - 1) * limite;

            const [exercicios, countResult] = await Promise.all([
                this.db
                    .select()
                    .from(exercicio)
                    .where(where)
                    .limit(limite)
                    .offset(offset)
                    .orderBy(
                        filtros.ordem_nome === 'desc'
                            ? desc(exercicio.nome)
                            : asc(exercicio.nome),
                    ),
                this.db
                    .select({ count: sql<number>`count(*)` })
                    .from(exercicio)
                    .where(where),
            ]);

            const total = Number(countResult[0].count);

            let musculos: (MusculoResumo & { exercicio_id: string })[] = [];
            if (incluirMusculos && exercicios.length > 0) {
                const ids = exercicios.map((e) => e.id!);
                musculos = await this.db
                    .select({
                        exercicio_id: exercicio_musculo.exercicio_id,
                        musculo_id: exercicio_musculo.musculo_id,
                        tipo_ativacao: exercicio_musculo.tipo_ativacao,
                        nome: musculo.nome,
                        grupo_muscular: musculo.grupo_muscular,
                    })
                    .from(exercicio_musculo)
                    .innerJoin(musculo, eq(exercicio_musculo.musculo_id, musculo.id))
                    .where(inArray(exercicio_musculo.exercicio_id, ids));
            }

            const musculosPorExercicio = new Map<string, MusculoResumo[]>();
            for (const m of musculos) {
                const lista = musculosPorExercicio.get(m.exercicio_id) ?? [];
                lista.push({
                    musculo_id: m.musculo_id,
                    tipo_ativacao: m.tipo_ativacao as 'PRIMARIO' | 'SECUNDARIO',
                    nome: m.nome,
                    grupo_muscular: m.grupo_muscular,
                });
                musculosPorExercicio.set(m.exercicio_id, lista);
            }

            const dados: ExercicioComMusculos[] = exercicios.map((e) => ({
                ...e,
                musculos: musculosPorExercicio.get(e.id!) ?? [],
            }));

            return {
                dados,
                total,
                page,
                limite,
                totalPages: Math.ceil(total / limite),
            };
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.getAllExercicios');
        }
    }

    async getByIdExercicio(id: string): Promise<ExercicioComMusculos | null> {
        try {
            const resposta = await this.db
                .select()
                .from(exercicio)
                .where(and(eq(exercicio.id, id), isNull(exercicio.deletado_em)));

            if (!resposta[0]) return null;

            const vinculosMusculos = await this.db
                .select({
                    musculo_id: exercicio_musculo.musculo_id,
                    tipo_ativacao: exercicio_musculo.tipo_ativacao,
                    nome: musculo.nome,
                    grupo_muscular: musculo.grupo_muscular,
                })
                .from(exercicio_musculo)
                .innerJoin(musculo, eq(exercicio_musculo.musculo_id, musculo.id))
                .where(eq(exercicio_musculo.exercicio_id, id));

            return {
                ...resposta[0],
                musculos: vinculosMusculos.map((m) => ({
                    ...m,
                    tipo_ativacao: m.tipo_ativacao as 'PRIMARIO' | 'SECUNDARIO',
                })),
            };
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.getByIdExercicio');
        }
    }

    async updateExercicio(
        id: string,
        dadosAtualizados: Partial<type_exercicio>,
        musculos?: { musculo_id: string; tipo_ativacao: 'PRIMARIO' | 'SECUNDARIO' }[],
    ): Promise<type_exercicio> {
        try {
            const resultado = await this.db.transaction(async (tx) => {
                let exercicioAtualizado;

                if (Object.keys(dadosAtualizados).length > 0) {
                    const [atualizado] = await tx
                        .update(exercicio)
                        .set(dadosAtualizados)
                        .where(and(eq(exercicio.id, id), isNull(exercicio.deletado_em)))
                        .returning();
                    exercicioAtualizado = atualizado;
                } else {
                    const [existente] = await tx
                        .select()
                        .from(exercicio)
                        .where(and(eq(exercicio.id, id), isNull(exercicio.deletado_em)));
                    exercicioAtualizado = existente;
                }

                if (musculos) {
                    await tx
                        .delete(exercicio_musculo)
                        .where(eq(exercicio_musculo.exercicio_id, id));

                    if (musculos.length > 0) {
                        await tx.insert(exercicio_musculo).values(
                            musculos.map((m) => ({
                                exercicio_id: id,
                                musculo_id: m.musculo_id,
                                tipo_ativacao: m.tipo_ativacao,
                            })),
                        );
                    }
                }

                return exercicioAtualizado;
            });
            return resultado;
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.updateExercicio');
        }
    }

    async softDeleteExercicio(id: string): Promise<type_exercicio> {
        try {
            const [resposta] = await this.db
                .update(exercicio)
                .set({ deletado_em: new Date() })
                .where(and(eq(exercicio.id, id), isNull(exercicio.deletado_em)))
                .returning();

            return resposta;
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.softDeleteExercicio');
        }
    }

    async hardDeleteExercicio(id: string): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                await tx.delete(exercicio_musculo).where(eq(exercicio_musculo.exercicio_id, id));
                await tx.delete(exercicio).where(eq(exercicio.id, id));
            });
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.hardDeleteExercicio');
        }
    }

    /**
     * Hard delete em cascata — exclusivo para admin.
    * Remove treino_exercicio, exercicio_musculo e exercicio em uma única transação.
     */
    async hardDeleteCascade(id: string): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                await tx.delete(treino_exercicio).where(eq(treino_exercicio.exercicio_id, id));
                await tx.delete(exercicio_musculo).where(eq(exercicio_musculo.exercicio_id, id));
                await tx.delete(exercicio).where(eq(exercicio.id, id));
            });
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.hardDeleteCascade');
        }
    }

    async findByNome(nome: string, alunoId?: string | null): Promise<type_exercicio | null> {
        try {
            const where = alunoId
                ? and(
                    eq(exercicio.nome, nome),
                    isNull(exercicio.deletado_em),
                    eq(exercicio.aluno_id, alunoId),
                )
                : and(
                    eq(exercicio.nome, nome),
                    isNull(exercicio.deletado_em),
                    isNull(exercicio.aluno_id),
                );

            const resposta = await this.db.select().from(exercicio).where(where);
            return resposta[0] || null;
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.findByNome');
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
            throw parseDatabaseError(error, 'ExercicioRepository.verificarAlunoExiste');
        }
    }

    async verificarMusculosExistem(musculoIds: string[]): Promise<{ validos: boolean; inexistentes: string[] }> {
        try {
            const encontrados = await this.db
                .select({ id: musculo.id })
                .from(musculo)
                .where(sql`${musculo.id} IN ${musculoIds}`);

            const idsEncontrados = new Set(encontrados.map((m) => m.id));
            const inexistentes = musculoIds.filter((id) => !idsEncontrados.has(id));

            return {
                validos: inexistentes.length === 0,
                inexistentes,
            };
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.verificarMusculosExistem');
        }
    }

    async contarReferenciasEmRotina(exercicioId: string): Promise<number> {
        try {
            const resultado = await this.db
                .select({ count: sql<number>`count(*)` })
                    .from(treino_exercicio)
                    .where(eq(treino_exercicio.exercicio_id, exercicioId));

            return Number(resultado[0].count);
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.contarReferenciasEmRotina');
        }
    }
}

export default ExercicioRepository;
