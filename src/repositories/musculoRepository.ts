import { DataBase } from "../config/DbConnect";
import { eq, and, isNull, asc, desc, count, sql } from "drizzle-orm";
import { musculo, exercicio_musculo, exercicio } from "../config/db/schema";
import { parseDatabaseError } from "../utils/errors/DatabaseError";
import { FiltrosMusculo, ResultadoPaginadoMusculo } from "../types/filters";

class MusculoRepository {
    private db: typeof DataBase;
    constructor() {
        this.db = DataBase;
    }

    async getAll(filtros: FiltrosMusculo): Promise<ResultadoPaginadoMusculo> {
        try {
            const {
                nome,
                grupo_muscular,
                ordem = 'nome_asc',
                incluir_contagem_grupo,
                page = 1,
                limite = 20,
            } = filtros;

            const condicoes = [];
            if (grupo_muscular) {
                condicoes.push(eq(musculo.grupo_muscular, grupo_muscular as any));
            }
            if (nome) {
                condicoes.push(
                    sql`unaccent(lower(${musculo.nome})) ilike unaccent(lower(${`%${nome}%`}))`
                );
            }
            const where = condicoes.length > 0 ? and(...condicoes) : undefined;
            const offset = (page - 1) * limite;

            let dados: { id: string; nome: string; grupo_muscular: string }[];

            if (ordem === 'popularidade_desc') {
                // Subquery: conta apenas exercícios ativos (sem soft delete)
                const popularidadeSq = this.db
                    .select({
                        musculo_id: exercicio_musculo.musculo_id,
                        total_exercicios: count(exercicio_musculo.exercicio_id).as('total_exercicios'),
                    })
                    .from(exercicio_musculo)
                    .innerJoin(
                        exercicio,
                        and(
                            eq(exercicio_musculo.exercicio_id, exercicio.id),
                            isNull(exercicio.deletado_em),
                        ),
                    )
                    .groupBy(exercicio_musculo.musculo_id)
                    .as('popularidade');

                dados = await this.db
                    .select({
                        id: musculo.id,
                        nome: musculo.nome,
                        grupo_muscular: musculo.grupo_muscular,
                    })
                    .from(musculo)
                    .leftJoin(popularidadeSq, eq(musculo.id, popularidadeSq.musculo_id))
                    .where(where)
                    .orderBy(desc(popularidadeSq.total_exercicios), asc(musculo.nome))
                    .limit(limite)
                    .offset(offset);
            } else {
                dados = await this.db
                    .select({
                        id: musculo.id,
                        nome: musculo.nome,
                        grupo_muscular: musculo.grupo_muscular,
                    })
                    .from(musculo)
                    .where(where)
                    .orderBy(ordem === 'nome_desc' ? desc(musculo.nome) : asc(musculo.nome))
                    .limit(limite)
                    .offset(offset);
            }

            const [countResult] = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(musculo)
                .where(where);

            const total = Number(countResult.count);

            if (!incluir_contagem_grupo) {
                return { dados, total, page, limite, totalPages: Math.ceil(total / limite) };
            }

            // Contagem total por grupo
            const TODOS_GRUPOS = ['PEITO', 'COSTAS', 'PERNAS', 'BRAÇOS', 'OMBROS', 'ABDOMEN'] as const;

            const contagemRaw = await this.db
                .select({
                    grupo_muscular: musculo.grupo_muscular,
                    total: count(musculo.id),
                })
                .from(musculo)
                .groupBy(musculo.grupo_muscular);

            const contagem_por_grupo: Record<string, number> = Object.fromEntries(
                TODOS_GRUPOS.map((g) => [g, 0])
            );
            for (const r of contagemRaw) {
                contagem_por_grupo[r.grupo_muscular] = Number(r.total);
            }

            return { dados, total, page, limite, totalPages: Math.ceil(total / limite), contagem_por_grupo };
        } catch (error) {
            throw parseDatabaseError(error, 'MusculoRepository.getAll');
        }
    }

    async getById(id: string) {
        try {
            const resultado = await this.db
                .select({
                    id: musculo.id,
                    nome: musculo.nome,
                    grupo_muscular: musculo.grupo_muscular,
                })
                .from(musculo)
                .where(eq(musculo.id, id));

            if (!resultado[0]) return null;

            const exerciciosVinculados = await this.db
                .select({
                    exercicio_id: exercicio.id,
                    nome: exercicio.nome,
                    descricao: exercicio.descricao,
                    tipo_ativacao: exercicio_musculo.tipo_ativacao,
                })
                .from(exercicio_musculo)
                .innerJoin(exercicio, eq(exercicio_musculo.exercicio_id, exercicio.id))
                .where(and(
                    eq(exercicio_musculo.musculo_id, id),
                    isNull(exercicio.deletado_em),
                ));

            return {
                ...resultado[0],
                exercicios: exerciciosVinculados.map((e) => ({
                    exercicio_id: e.exercicio_id,
                    nome: e.nome,
                    descricao: e.descricao,
                    tipo_ativacao: e.tipo_ativacao as 'PRIMARIO' | 'SECUNDARIO',
                })),
            };
        } catch (error) {
            throw parseDatabaseError(error, 'MusculoRepository.getById');
        }
    }
}

export default MusculoRepository;
