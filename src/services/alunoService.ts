import AlunoRepository from "../repositories/alunoRepository";
import { type_aluno } from "../types/dbSchemas";
import { ZodError } from "zod";
import { alunoSchema, alunoUpdateSchema } from "../utils/validations/alunoValidation";

class AlunoService {
    private repository: AlunoRepository
    constructor() {
        this.repository = new AlunoRepository()
    }

    async createAluno(novoAluno: type_aluno): Promise<type_aluno> {
        console.log('[AlunoService] [createAluno] Dados recebidos do controller:', JSON.stringify(novoAluno, null, 2));
        try {
            const alunoSanitizado = {
                ...novoAluno,
                data_nascimento: new Date(novoAluno.data_nascimento).toISOString().split('T')[0],
                status_conta: true,
                academia_id: Number(novoAluno.academia_id),
            }
            console.log('[AlunoService] [createAluno] Dados sanitizados:', JSON.stringify(alunoSanitizado, null, 2));

            console.log('[AlunoService] [createAluno] Iniciando validação com Zod...');
            alunoSchema.parse(alunoSanitizado)
            console.log('[AlunoService] [createAluno] Validação Zod concluída com sucesso');

            console.log('[AlunoService] [createAluno] Chamando repository.createAluno...');
            const resposta = await this.repository.createAluno(alunoSanitizado)
            console.log('[AlunoService] [createAluno] Aluno persistido com sucesso:', JSON.stringify(resposta, null, 2));
            return resposta
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[AlunoService] [createAluno] Falha na validação Zod:', error.issues);
                throw error;
            }
            // Repropaga DatabaseError e qualquer outro erro sem re-envolver
            console.warn('[AlunoService] [createAluno] Erro recebido do repository, propagando...');
            throw error;
        }
    }
}

export default AlunoService