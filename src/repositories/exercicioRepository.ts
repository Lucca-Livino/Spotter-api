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
