import MusculoRepository from "../repositories/musculoRepository";
import { ZodError } from "zod";
import { musculoQuerySchema, musculoIdSchema } from "../utils/validations/musculoValidation";
import { FiltrosMusculo, ResultadoPaginadoMusculo } from "../types/filters";

class MusculoService {
    private repository: MusculoRepository;

    constructor() {
        this.repository = new MusculoRepository();
    }

    async getAll(query: any): Promise<ResultadoPaginadoMusculo> {
        try {
            const { nome, grupo_muscular, ordem, incluir_contagem_grupo, page, limite } = musculoQuerySchema.parse(query);

            const filtros: FiltrosMusculo = { ordem, incluir_contagem_grupo, page, limite };
            if (nome) filtros.nome = nome;
            if (grupo_muscular) filtros.grupo_muscular = grupo_muscular;

            return await this.repository.getAll(filtros);
        } catch (error) {
            if (error instanceof ZodError) {
                console.warn('[MusculoService] [getAll] Falha na validação Zod:', error.issues);
            }
            throw error;
        }
    }

    async getById(idParam: string) {
        const id = musculoIdSchema.parse(idParam);

        const musculo = await this.repository.getById(id);

        if (!musculo) {
            throw new Error('Músculo não encontrado');
        }

        return musculo;
    }
}

export default MusculoService;
