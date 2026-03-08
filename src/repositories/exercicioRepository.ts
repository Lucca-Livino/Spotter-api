import { DataBase } from "../config/DbConnect";
import { eq, and, or, isNull, ilike, sql, inArray, SQL } from "drizzle-orm";
import { exercicio, exercicio_musculo, musculo } from "../config/db/schema";
import { type_exercicio } from "../types/dbSchemas";
import { parseDatabaseError } from "../utils/errors/DatabaseError";

// Tipos auxiliares
interface FiltrosExercicio {
    nome?: string;
    grupo_muscular?: string;
    aluno_id?: string;
}

interface ResultadoPaginado {
    dados: type_exercicio[];
    total: number;
    page: number;
    limite: number;
    totalPages: number;
}

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
                // 1) Insere exercício
                const [exercicioCriado] = await tx
                    .insert(exercicio)
                    .values(novoExercicio)
                    .returning();

                // 2) Insere vínculos N:M com músculos
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

    async listarExercicios(
        filtros: FiltrosExercicio,
        page: number,
        limite: number,
    ): Promise<ResultadoPaginado> {
        try {
            const condicoes: SQL[] = [isNull(exercicio.deletado_em)];

            // Filtro por nome
            if (filtros.nome) {
                condicoes.push(ilike(exercicio.nome, `%${filtros.nome}%`));
            }

            // Filtro por aluno_id -> mostra globais + pessoais do aluno
            if (filtros.aluno_id) {
                condicoes.push(
                    or(
                        isNull(exercicio.aluno_id),
                        eq(exercicio.aluno_id, filtros.aluno_id),
                    )!,
                );
            } else {
                condicoes.push(isNull(exercicio.aluno_id));
            }

            // Filtro por grupo_muscular via subquery (exercícios que possuem ao menos 1 músculo no grupo)
            if (filtros.grupo_muscular) {
                const idsExercicios = this.db
                    .selectDistinct({ id: exercicio_musculo.exercicio_id })
                    .from(exercicio_musculo)
                    .innerJoin(musculo, eq(exercicio_musculo.musculo_id, musculo.id))
                    .where(eq(musculo.grupo_muscular, filtros.grupo_muscular as any));

                condicoes.push(inArray(exercicio.id, idsExercicios));
            }

            const where = and(...condicoes);
            const offset = (page - 1) * limite;

            const [dados, countResult] = await Promise.all([
                this.db
                    .select()
                    .from(exercicio)
                    .where(where)
                    .limit(limite)
                    .offset(offset)
                    .orderBy(exercicio.nome),
                this.db
                    .select({ count: sql<number>`count(*)` })
                    .from(exercicio)
                    .where(where),
            ]);

            const total = Number(countResult[0].count);

            let dadosComMusculos: (type_exercicio & { musculos: any[] })[] = dados.map(e => ({ ...e, musculos: [] }));

            if (dados.length > 0) {
                const ids = dados.map(e => e.id!);
                const vinculosMusculos = await this.db
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

                const musculosPorExercicio = new Map<string, any[]>();
                for (const vínculo of vinculosMusculos) {
                    if (!musculosPorExercicio.has(vínculo.exercicio_id)) {
                        musculosPorExercicio.set(vínculo.exercicio_id, []);
                    }
                    musculosPorExercicio.get(vínculo.exercicio_id)!.push(vínculo);
                }

                dadosComMusculos = dadosComMusculos.map(e => ({
                    ...e,
                    musculos: musculosPorExercicio.get(e.id!) ?? [],
                }));
            }

            return {
                dados: dadosComMusculos,
                total,
                page,
                limite,
                totalPages: Math.ceil(total / limite),
            };
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.listarExercicios');
        }
    }

    async getExercicioById(id: string): Promise<(type_exercicio & { musculos?: any[] }) | null> {
        try {
            const resposta = await this.db
                .select()
                .from(exercicio)
                .where(and(eq(exercicio.id, id), isNull(exercicio.deletado_em)));

            if (!resposta[0]) return null;

            // Busca vínculos de músculos do exercício
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

            return { ...resposta[0], musculos: vinculosMusculos };
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.getExercicioById');
        }
    }

    async findByNome(nome: string, alunoId?: string | null): Promise<type_exercicio | null> {
        try {
            const condicoes = alunoId
                ? and(
                    eq(exercicio.nome, nome),
                    isNull(exercicio.deletado_em),
                    or(isNull(exercicio.aluno_id), eq(exercicio.aluno_id, alunoId)),
                )
                : and(
                    eq(exercicio.nome, nome),
                    isNull(exercicio.deletado_em),
                    isNull(exercicio.aluno_id),
                );

            const resposta = await this.db.select().from(exercicio).where(condicoes);
            return resposta[0] || null;
        } catch (error) {
            throw parseDatabaseError(error, 'ExercicioRepository.findByNome');
        }
    }
}

export default ExercicioRepository;
