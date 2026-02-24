import { DataBase } from "../config/DbConnect";
import { eq } from "drizzle-orm";
import { aluno } from "../config/db/schema";
import { type_aluno } from "../types/dbSchemas";
import { parseDatabaseError } from "../utils/errors/DatabaseError";

class AlunoRepository {
    private db: typeof DataBase;
    constructor() {
        this.db = DataBase
    }

    async createAluno(novoAluno: type_aluno): Promise<type_aluno> {
        console.log('[AlunoRepository] [createAluno] Iniciando inserção no banco de dados...');
        console.log('[AlunoRepository] [createAluno] Dados a inserir:', JSON.stringify(novoAluno, null, 2));
        try {
            const { academia_id, ...restAluno } = novoAluno;
            const resposta = await this.db.insert(aluno).values({ ...restAluno, academia_id: academia_id }).returning();
            console.log('[AlunoRepository] [createAluno] Inserção concluída. Registro retornado:', JSON.stringify(resposta[0], null, 2));
            return resposta[0];
        } catch (error) {
            throw parseDatabaseError(error, 'AlunoRepository.createAluno');
        }
    }
}

export default AlunoRepository