import ExercicioRepository from "../repositories/exercicioRepository";
import { type_exercicio } from "../types/dbSchemas";
import { ZodError } from "zod";
import {
    exercicioSchema,
    exercicioQuerySchema,
    exercicioIdSchema,
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

    async listarExercicios(query: any): Promise<ResultadoPaginado> {
        try {
            const { page, limite, nome, grupo_muscular, aluno_id } = exercicioQuerySchema.parse(query);

            const filtros: FiltrosExercicio = {};
            if (nome) filtros.nome = nome;
            if (grupo_muscular) filtros.grupo_muscular = grupo_muscular;
            if (aluno_id) filtros.aluno_id = aluno_id;

            return await this.repository.listarExercicios(filtros, page, limite);
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[ExercicioService] [listarExercicios] Falha na validação Zod:', error.issues);
            }
            throw error;
        }
    }

    async getExercicioById(idParam: string): Promise<type_exercicio> {
        const id = exercicioIdSchema.parse(idParam);

        try {
            const exercicioEncontrado = await this.repository.getExercicioById(id);

            if (!exercicioEncontrado) {
                throw new Error('Exercício não encontrado');
            }

            // TODO: [AUTH] Quando implementado, validar se o usuário tem permissão:
            // - Exercício global (aluno_id = NULL): qualquer usuário autenticado pode visualizar
            // - Exercício pessoal: apenas o dono (aluno_id === usuarioLogadoId) ou ADMIN pode visualizar

            return exercicioEncontrado;
        } catch (error) {
            throw error;
        }
    }

}

export default ExercicioService;
