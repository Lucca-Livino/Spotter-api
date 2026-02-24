import { ZodError } from "zod";
import AcademiaRepository from "../repositories/academiaRepository";
import { type_academia } from "../types/dbSchemas";
import { academiaSchema, academiaUpdateSchema } from "../utils/validations/academiaValidation";

class AcademiaService {
    private repository: AcademiaRepository;

    constructor() {
        this.repository = new AcademiaRepository();
    }

    async createAcademia(novaAcademia: type_academia): Promise<type_academia> {
        try {
            academiaSchema.parse(novaAcademia);
            const academiaCriada = await this.repository.createAcademia(novaAcademia);
            return academiaCriada;
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[AlunoService] [createAluno] Falha na validação Zod:', error.issues);
                throw error;
            }
            // Repropaga DatabaseError e qualquer outro erro sem re-envolver
            console.warn('[AcademiaService] [createAcademia] Erro recebido do repository, propagando...');
            throw error;
        }
    }

    async getAllAcademias(): Promise<type_academia[]> {
        try {
            const academias = await this.repository.getAllAcademias();
            return academias;
        } catch (error) {
            throw new Error(`Erro ao buscar academias: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    async getAcademiaById(id: number): Promise<type_academia> {
        console.log(`Recebido id no Service: ${id} do tipo ${typeof id}`);
        if (isNaN(id)) {
            throw new Error('O id deve ser um número válido');
        }
        try {
            console.log(`Buscando academia com id: ${id}`);
            const academia = await this.repository.getAcademiaById(id);
            return academia;
        } catch (error) {
            throw new Error(`Erro ao buscar academia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    async updateAcademia(id: number, academiaEditada: Partial<type_academia>): Promise<Partial<type_academia>> {
        try {
            academiaUpdateSchema.parse(academiaEditada)
            const academiaAtualizada = await this.repository.updateAcademia(id, academiaEditada)
            return academiaAtualizada
        } catch (error) {
            if (error instanceof ZodError) {
                throw error;
            }

            throw new Error(`Erro ao criar academia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
    }

    async deleteAcademia(id: number): Promise<type_academia> {
        try {
            const academiaDeletada = await this.repository.deleteAcademia(id)
            return academiaDeletada
        } catch (error) {
            throw new Error(`Erro ao criar academia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
    }
}

export default AcademiaService;