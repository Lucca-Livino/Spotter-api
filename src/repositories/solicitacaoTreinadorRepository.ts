import { DataBase } from "../config/DbConnect";
import { and, eq, desc } from "drizzle-orm";
import { solicitacao_treinador, aluno, treinador } from "../config/db/schema";
import { type_solicitacao_treinador, enum_status_solicitacao } from "../types/dbSchemas";
import { parseDatabaseError } from "../utils/errors/DatabaseError";

class SolicitacaoTreinadorRepository {
    private db: typeof DataBase;

    constructor() {
        this.db = DataBase;
    }

    async create(alunoId: string, treinadorId: string): Promise<type_solicitacao_treinador> {
        try {
            const [resultado] = await this.db
                .insert(solicitacao_treinador)
                .values({ aluno_id: alunoId, treinador_id: treinadorId })
                .returning();
            return resultado as unknown as type_solicitacao_treinador;
        } catch (error) {
            throw parseDatabaseError(error, "SolicitacaoTreinadorRepository.create");
        }
    }

    async findByAlunoAndTreinador(alunoId: string, treinadorId: string): Promise<type_solicitacao_treinador | null> {
        try {
            const resultado = await this.db
                .select()
                .from(solicitacao_treinador)
                .where(and(
                    eq(solicitacao_treinador.aluno_id, alunoId),
                    eq(solicitacao_treinador.treinador_id, treinadorId)
                ))
                .orderBy(desc(solicitacao_treinador.created_at))
                .limit(1);
            return resultado[0] as unknown as type_solicitacao_treinador ?? null;
        } catch (error) {
            throw parseDatabaseError(error, "SolicitacaoTreinadorRepository.findByAlunoAndTreinador");
        }
    }

    async findPendenteByAlunoId(alunoId: string): Promise<type_solicitacao_treinador | null> {
        try {
            const resultado = await this.db
                .select()
                .from(solicitacao_treinador)
                .where(and(
                    eq(solicitacao_treinador.aluno_id, alunoId),
                    eq(solicitacao_treinador.status, 'PENDENTE')
                ))
                .limit(1);
            return resultado[0] as unknown as type_solicitacao_treinador ?? null;
        } catch (error) {
            throw parseDatabaseError(error, "SolicitacaoTreinadorRepository.findPendenteByAlunoId");
        }
    }

    async findAtivaPorUserId(userId: string): Promise<any | null> {
        try {
            const rows = await this.db
                .select({
                    id: solicitacao_treinador.id,
                    aluno_id: solicitacao_treinador.aluno_id,
                    treinador_id: solicitacao_treinador.treinador_id,
                    status: solicitacao_treinador.status,
                    created_at: solicitacao_treinador.created_at,
                    updated_at: solicitacao_treinador.updated_at,
                    treinador_nome: treinador.nome,
                    treinador_url_foto: treinador.url_foto,
                    treinador_cref: treinador.cref,
                    treinador_especializacao: treinador.especializacao,
                    treinador_graduacao: treinador.graduacao,
                })
                .from(solicitacao_treinador)
                .innerJoin(aluno, eq(solicitacao_treinador.aluno_id, aluno.id))
                .innerJoin(treinador, eq(solicitacao_treinador.treinador_id, treinador.id))
                .where(and(
                    eq(aluno.user_id, userId),
                    eq(solicitacao_treinador.status, 'PENDENTE')
                ))
                .orderBy(desc(solicitacao_treinador.created_at))
                .limit(1);

            if (rows.length === 0) return null;
            const row = rows[0];
            return {
                id: row.id,
                aluno_id: row.aluno_id,
                treinador_id: row.treinador_id,
                status: row.status,
                created_at: row.created_at,
                updated_at: row.updated_at,
                treinador: {
                    id: row.treinador_id,
                    nome: row.treinador_nome,
                    url_foto: row.treinador_url_foto,
                    cref: row.treinador_cref,
                    especializacao: row.treinador_especializacao,
                    graduacao: row.treinador_graduacao,
                },
            };
        } catch (error) {
            throw parseDatabaseError(error, "SolicitacaoTreinadorRepository.findAtivaPorUserId");
        }
    }

    async listByTreinadorUserId(treinadorUserId: string, status?: string): Promise<any[]> {
        try {
            const conditions: any[] = [eq(treinador.user_id, treinadorUserId)];
            if (status) {
                conditions.push(eq(solicitacao_treinador.status, status as any));
            }

            const rows = await this.db
                .select({
                    id: solicitacao_treinador.id,
                    aluno_id: solicitacao_treinador.aluno_id,
                    treinador_id: solicitacao_treinador.treinador_id,
                    status: solicitacao_treinador.status,
                    created_at: solicitacao_treinador.created_at,
                    aluno_nome: aluno.nome,
                    aluno_url_foto: aluno.url_foto,
                })
                .from(solicitacao_treinador)
                .innerJoin(treinador, eq(solicitacao_treinador.treinador_id, treinador.id))
                .innerJoin(aluno, eq(solicitacao_treinador.aluno_id, aluno.id))
                .where(and(...conditions))
                .orderBy(desc(solicitacao_treinador.created_at));

            return rows.map(row => ({
                id: row.id,
                aluno_id: row.aluno_id,
                treinador_id: row.treinador_id,
                status: row.status,
                created_at: row.created_at,
                aluno: {
                    id: row.aluno_id,
                    nome: row.aluno_nome,
                    url_foto: row.aluno_url_foto,
                },
            }));
        } catch (error) {
            throw parseDatabaseError(error, "SolicitacaoTreinadorRepository.listByTreinadorUserId");
        }
    }

    async findById(id: string): Promise<type_solicitacao_treinador | null> {
        try {
            const resultado = await this.db
                .select()
                .from(solicitacao_treinador)
                .where(eq(solicitacao_treinador.id, id))
                .limit(1);
            return resultado[0] as unknown as type_solicitacao_treinador ?? null;
        } catch (error) {
            throw parseDatabaseError(error, "SolicitacaoTreinadorRepository.findById");
        }
    }

    async updateStatus(id: string, status: enum_status_solicitacao): Promise<type_solicitacao_treinador | null> {
        try {
            const [resultado] = await this.db
                .update(solicitacao_treinador)
                .set({ status, updated_at: new Date() })
                .where(eq(solicitacao_treinador.id, id))
                .returning();
            return resultado as unknown as type_solicitacao_treinador ?? null;
        } catch (error) {
            throw parseDatabaseError(error, "SolicitacaoTreinadorRepository.updateStatus");
        }
    }
}

export default SolicitacaoTreinadorRepository;
