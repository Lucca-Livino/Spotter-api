import ExercicioRepository from "../repositories/exercicioRepository";
import { type_exercicio } from "../types/dbSchemas";
import { ZodError } from "zod";
import {
    exercicioSchema
} from "../utils/validations/exercicioValidation";

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

class ExercicioService {
    private repository: ExercicioRepository;

    constructor() {
        this.repository = new ExercicioRepository();
    }

    async createExercicio(body: any): Promise<type_exercicio> {
        try {
            const dadosValidados = exercicioSchema.parse(body);

            // Verificar duplicidade de nome na base global OU na base privada do aluno
            const exercicioExistente = await this.repository.findByNome(
                dadosValidados.nome,
                dadosValidados.aluno_id,
            );

            if (exercicioExistente) {
                throw new Error('Já existe um exercício com este nome');
            }

            const novoExercicio: type_exercicio = {
                nome: dadosValidados.nome,
                descricao: dadosValidados.descricao ?? null,
                aluno_id: dadosValidados.aluno_id ?? null,
            };

            const exercicioCriado = await this.repository.createExercicio(
                novoExercicio,
                dadosValidados.musculos,
            );

            // Retorna o exercício com músculos associados
            return await this.repository.getExercicioById(exercicioCriado.id!) as type_exercicio;
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[ExercicioService] [createExercicio] Falha na validação Zod:', error.issues);
            } else {
                console.warn('[ExercicioService] [createExercicio] Erro recebido, propagando...');
            }
            throw error;
        }
    }
}

export default ExercicioService;
