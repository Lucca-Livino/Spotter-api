import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const treinoSchema = z.object({
    nome: z
        .string()
        .min(1, { message: 'O nome do treino é obrigatório' })
        .max(255, { message: 'O nome do treino deve ter no máximo 255 caracteres' })
        .openapi({ description: 'Nome do treino', example: 'Treino A - Peito e Tríceps' }),
    descricao: z
        .string()
        .max(1000, { message: 'A descrição deve ter no máximo 1000 caracteres' })
        .nullable()
        .optional()
        .openapi({ description: 'Descrição do treino', example: 'Treino focado em membros superiores' }),
    aluno_id: z
        .string()
        .uuid({ message: 'O ID do aluno deve ser um UUID válido' })
        .optional()
        .openapi({ description: 'UUID do aluno dono do treino', example: '550e8400-e29b-41d4-a716-446655440000' }),
}).strict().openapi('TreinoInput');

const treinoIdSchema = z
    .string()
    .uuid('ID inválido, deve ser um UUID válido')
    .openapi({ description: 'UUID do treino', example: '550e8400-e29b-41d4-a716-446655440010' });

const treinoDetalheQuerySchema = z.object({
    nome_exercicio: z
        .string()
        .trim()
        .min(1)
        .max(255)
        .optional()
        .openapi({
            description: 'Filtra exercícios do treino por nome (contém, case-insensitive)',
            example: 'supino',
        }),
    grupo_muscular: z
        .enum(['PEITO', 'COSTAS', 'PERNAS', 'BRAÇOS', 'OMBROS', 'ABDOMEN'])
        .optional()
        .openapi({
            description: 'Filtra exercícios do treino por grupo muscular',
            example: 'PEITO',
        }),
    tipo_ativacao: z
        .enum(['PRIMARIO', 'SECUNDARIO'])
        .optional()
        .openapi({
            description: 'Filtra exercícios do treino por tipo de ativação muscular',
            example: 'PRIMARIO',
        }),
    ordem_execucao: z
        .enum(['asc', 'desc'])
        .default('asc')
        .openapi({
            description: 'Define ordenação da lista de exercícios por ordem_execucao',
            example: 'asc',
        }),
    apenas_ativos: z
        .coerce
        .boolean()
        .default(true)
        .openapi({
            description: 'Quando true, retorna apenas exercícios ativos (deletado_em nulo)',
            example: true,
        }),
    incluir_musculos: z
        .coerce
        .boolean()
        .default(false)
        .openapi({
            description: 'Quando true, popula músculos vinculados de cada exercício',
            example: true,
        }),
    incluir_aparelhos: z
        .coerce
        .boolean()
        .default(false)
        .openapi({
            description: 'Quando true, popula aparelhos vinculados de cada exercício',
            example: false,
        }),
}).strict().openapi('TreinoDetalheQuery');

type TreinoDetalheQuery = z.infer<typeof treinoDetalheQuerySchema>;

const treinoListQuerySchema = z.object({
    nome: z
        .string()
        .trim()
        .min(1)
        .max(255)
        .optional()
        .openapi({
            description: 'Filtra treinos por nome (contém, case-insensitive)',
            example: 'Treino A',
        }),
    usuario_id: z
        .string()
        .uuid({ message: 'usuario_id deve ser um UUID válido' })
        .optional()
        .openapi({
            description: 'Filtra treinos por aluno dono',
            example: '550e8400-e29b-41d4-a716-446655440000',
        }),
    treinador_id: z
        .string()
        .uuid({ message: 'treinador_id deve ser um UUID válido' })
        .optional()
        .openapi({
            description: 'Filtra treinos por treinador responsável',
            example: '550e8400-e29b-41d4-a716-446655440002',
        }),
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => Number.isInteger(val) && val > 0, {
            message: 'page deve ser um número inteiro maior que 0',
        })
        .openapi({ description: 'Número da página', example: '1' }),
    limite: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, {
            message: 'limite deve ser entre 1 e 100',
        })
        .openapi({ description: 'Limite de itens por página', example: '10' }),
    ordem_data_criacao: z
        .enum(['asc', 'desc'])
        .default('desc')
        .openapi({
            description: 'Ordena por data_criacao do treino',
            example: 'desc',
        }),
    incluir_exercicios: z
        .coerce
        .boolean()
        .default(false)
        .openapi({
            description: 'Quando true, inclui os exercícios de cada treino na listagem',
            example: false,
        }),
    somente_com_exercicios: z
        .coerce
        .boolean()
        .default(false)
        .openapi({
            description: 'Quando true, retorna apenas treinos que possuem exercícios vinculados',
            example: true,
        }),
    nome_exercicio: treinoDetalheQuerySchema.shape.nome_exercicio,
    grupo_muscular: treinoDetalheQuerySchema.shape.grupo_muscular,
    tipo_ativacao: treinoDetalheQuerySchema.shape.tipo_ativacao,
    ordem_execucao: treinoDetalheQuerySchema.shape.ordem_execucao,
    apenas_ativos: treinoDetalheQuerySchema.shape.apenas_ativos,
    incluir_musculos: treinoDetalheQuerySchema.shape.incluir_musculos,
    incluir_aparelhos: treinoDetalheQuerySchema.shape.incluir_aparelhos,
}).strict().openapi('TreinoListQuery');

type TreinoListQuery = z.infer<typeof treinoListQuerySchema>;

export { treinoSchema, treinoIdSchema, treinoDetalheQuerySchema, treinoListQuerySchema };
export type { TreinoDetalheQuery, TreinoListQuery };
