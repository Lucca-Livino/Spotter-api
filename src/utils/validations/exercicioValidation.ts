import { z } from 'zod';
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const booleanQueryParam = z
    .enum(['true', 'false'])
    .transform((val) => val === 'true');

const exercicioSchema = z.object({
    nome: z
        .string()
        .min(1, { message: "O nome do exercício é obrigatório" })
        .max(255, { message: "O nome do exercício deve ter no máximo 255 caracteres" })
        .openapi({ description: "Nome do exercício", example: "Supino Reto" }),
    descricao: z
        .string()
        .max(1000, { message: "A descrição deve ter no máximo 1000 caracteres" })
        .nullable()
        .optional()
        .openapi({ description: "Descrição do exercício", example: "Exercício para peitorais" }),
    aluno_id: z
        .string()
        .uuid({ message: "O ID do aluno deve ser um UUID válido" })
        .nullable()
        .optional()
        .openapi({ description: "UUID do aluno (null para exercício global)", example: "550e8400-e29b-41d4-a716-446655440000" }),
    musculos: z
        .array(z.object({
            musculo_id: z.string().uuid({ message: "O ID do músculo deve ser um UUID válido" })
                .openapi({ description: "UUID do músculo", example: "550e8400-e29b-41d4-a716-446655440001" }),
            tipo_ativacao: z.enum(['PRIMARIO', 'SECUNDARIO'], { message: "Tipo de ativação deve ser 'PRIMARIO' ou 'SECUNDARIO'" })
                .openapi({ description: "Tipo de ativação muscular", example: "PRIMARIO" }),
        }).strict())
        .min(1, { message: "É obrigatório informar ao menos um músculo associado" })
        .openapi({ description: "Lista de músculos associados ao exercício" }),
}).strict().openapi("ExercicioInput");

const exercicioUpdateSchema = z.object({
    nome: z
        .string()
        .min(1, { message: "O nome do exercício é obrigatório" })
        .max(255, { message: "O nome do exercício deve ter no máximo 255 caracteres" })
        .optional()
        .openapi({ description: "Nome do exercício", example: "Supino Inclinado" }),
    descricao: z
        .string()
        .max(1000, { message: "A descrição deve ter no máximo 1000 caracteres" })
        .nullable()
        .optional()
        .openapi({ description: "Descrição do exercício", example: "Exercício para peitorais superiores" }),
    musculos: z
        .array(z.object({
            musculo_id: z.string().uuid({ message: "O ID do músculo deve ser um UUID válido" })
                .openapi({ description: "UUID do músculo", example: "550e8400-e29b-41d4-a716-446655440001" }),
            tipo_ativacao: z.enum(['PRIMARIO', 'SECUNDARIO'], { message: "Tipo de ativação deve ser 'PRIMARIO' ou 'SECUNDARIO'" })
                .openapi({ description: "Tipo de ativação muscular", example: "PRIMARIO" }),
        }).strict())
        .min(1, { message: "É obrigatório informar ao menos um músculo associado" })
        .optional()
        .openapi({ description: "Lista de músculos associados ao exercício (substitui todos os vínculos existentes)" }),
}).strict().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Ao menos um campo deve ser informado para atualização' },
).openapi("ExercicioUpdateInput");

const exercicioQuerySchema = z.object({
    nome: z
        .string()
        .optional()
        .openapi({ description: "Filtrar por nome do exercício", example: "Supino" }),
    grupo_muscular: z
        .enum(['PEITO', 'COSTAS', 'PERNAS', 'BRAÇOS', 'OMBROS', 'ABDOMEN'])
        .optional()
        .openapi({ description: "Filtrar por grupo muscular", example: "PEITO" }),
    tipo_ativacao: z
        .enum(['PRIMARIO', 'SECUNDARIO'])
        .optional()
        .openapi({ description: "Filtrar por tipo de ativação muscular", example: "PRIMARIO" }),
    aluno_id: z
        .string()
        .uuid({ message: 'aluno_id deve ser um UUID válido' })
        .optional()
        .openapi({ description: "Filtrar por UUID do aluno", example: "550e8400-e29b-41d4-a716-446655440000" }),
    escopo: z
        .enum(['GLOBAL', 'PESSOAL', 'TODOS'])
        .optional()
        .openapi({
            description: "Define o escopo da biblioteca de exercícios. GLOBAL=apenas globais, PESSOAL=apenas pessoais do aluno informado/contexto, TODOS=globais+pessoais.",
            example: "TODOS",
        }),
    em_uso: booleanQueryParam
        .optional()
        .openapi({
            description: "Filtra exercícios que já estão (ou não) vinculados a algum treino",
            example: "true",
        }),
    ordem_nome: z
        .enum(['asc', 'desc'])
        .default('asc')
        .openapi({ description: "Ordenação alfabética por nome", example: "asc" }),
    incluir_musculos: z
        .enum(['true', 'false'])
        .default('true')
        .transform(v => v === 'true')
        .openapi({
            description: "Quando false, não popula músculos na listagem (resposta mais leve)",
            example: "true",
        }),
    incluir_inativos: z
        .enum(['true', 'false'])
        .default('false')
        .transform(v => v === 'true')
        .openapi({
            description: "Quando true (somente admin), inclui exercícios desativados (soft-deleted) na listagem",
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
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, {
            message: 'limite deve ser entre 1 e 100',
        })
        .openapi({ description: "Limite de resultados por página", example: "10" }),
}).openapi("ExercicioQuery");

const exercicioIdSchema = z
    .string()
    .uuid('ID inválido, deve ser um UUID válido')
    .openapi({ description: "UUID do exercício", example: "550e8400-e29b-41d4-a716-446655440000" });

export { exercicioSchema, exercicioUpdateSchema, exercicioQuerySchema, exercicioIdSchema };
