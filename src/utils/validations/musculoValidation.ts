import { z } from 'zod';
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

function normalizarGrupoMuscular(val: string): string {
    const semAcento = val.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const canonico: Record<string, string> = {
        BRACOS: 'BRAÇOS',
    };
    return canonico[semAcento] ?? semAcento;
}

const GRUPOS_MUSCULARES = ['PEITO', 'COSTAS', 'PERNAS', 'BRAÇOS', 'OMBROS', 'ABDOMEN'] as const;

const musculoQuerySchema = z.object({
    nome: z
        .string()
        .optional()
        .openapi({ description: "Filtrar por nome do músculo (busca parcial, case e accent insensitive via unaccent)", example: "triceps" }),
    grupo_muscular: z
        .string()
        .optional()
        .transform((val) => (val ? normalizarGrupoMuscular(val) : val))
        .pipe(z.enum(GRUPOS_MUSCULARES).optional())
        .openapi({ description: "Filtrar por grupo muscular (tolerante a caixa e acentos: 'peito', 'PEITO', 'bracos' e 'BRAÇOS' são aceitos)", example: "PEITO" }),
    ordem: z
        .enum(['nome_asc', 'nome_desc', 'popularidade_desc'])
        .default('nome_asc')
        .openapi({
            description: "Ordenação: nome_asc (A→Z), nome_desc (Z→A), popularidade_desc (mais exercícios ativos vinculados primeiro)",
            example: "nome_asc",
        }),
    incluir_contagem_grupo: z
        .enum(['true', 'false'])
        .default('false')
        .transform((v) => v === 'true')
        .openapi({
            description: "Quando true, inclui contagem total de músculos por grupo (útil para chips com badge na UI)",
            example: "false",
        }),
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => Number.isInteger(val) && val > 0, {
            message: 'page deve ser um número inteiro maior que 0',
        })
        .openapi({ description: "Número da página", example: "1" }),
    limite: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 20))
        .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, {
            message: 'limite deve ser entre 1 e 100',
        })
        .openapi({ description: "Limite de resultados por página (máx. 100)", example: "20" }),
}).strict().openapi("MusculoQuery");

const musculoIdSchema = z
    .string()
    .uuid('ID inválido, deve ser um UUID válido')
    .openapi({ description: "UUID do músculo", example: "550e8400-e29b-41d4-a716-446655440000" });

export { musculoQuerySchema, musculoIdSchema };
