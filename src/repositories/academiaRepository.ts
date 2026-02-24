import { eq } from "drizzle-orm";
import { DataBase } from "../config/DbConnect";
import { academia } from "../config/db/schema";
import { type_academia } from "../types/dbSchemas"
import { parseDatabaseError } from "../utils/errors/DatabaseError";

class AcademiaRepository {
    private db: typeof DataBase;
    constructor() {
        this.db = DataBase;
    }

    async createAcademia(novaAcademia: type_academia): Promise<type_academia> {
        try {
            const resposta = await this.db.insert(academia).values(novaAcademia).returning();
            return resposta[0]
        } catch (error) {
            throw parseDatabaseError(error, 'AlunoRepository.createAluno');
        }
    }

    async getAllAcademias(): Promise<type_academia[]> {
        try {
            const resposta = await this.db.select().from(academia);
            return resposta;
        } catch (error) {
            throw new Error(`Erro ao buscar academias: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    async getAcademiaById(id: number): Promise<type_academia> {
        try {
            const resposta = await this.db.select().from(academia).where(eq(academia.id, id));
            return resposta[0];
        } catch (error) {
            throw new Error(`Erro ao buscar academia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    async updateAcademia(id: number, academiaEditada: Partial<type_academia>): Promise<Partial<type_academia>> {
        try {
            const resposta = await this.db.update(academia).set(academiaEditada).where(eq(academia.id, id)).returning();
            return resposta[0];
        } catch (error) {
            throw new Error(`Erro ao atualizar academia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    async deleteAcademia(id: number): Promise<type_academia> {
        try {
            const resposta = await this.db.delete(academia).where(eq(academia.id, id)).returning()
            return resposta[0]
        } catch (error) {
            throw new Error(`Erro ao atualizar academia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }
}

export default AcademiaRepository;