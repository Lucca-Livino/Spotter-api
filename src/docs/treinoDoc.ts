import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
    treinoSchema,
    treinoUpdateSchema,
    treinoDetalheQuerySchema,
    treinoListQuerySchema,
    treinoDeleteQuerySchema,
} from '../utils/validations/treinoValidation';

export const treinoRegistry = new OpenAPIRegistry();

const TreinoResponse = z.object({
    id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440009' }),
    nome: z.string().openapi({ example: 'Treino A - Peito e Tríceps' }),
    descricao: z.string().nullable().openapi({ example: 'Treino focado em membros superiores' }),
    data_criacao: z.coerce.date().openapi({ example: '2026-03-17T10:00:00.000Z' }),
    deletado_em: z.coerce.date().nullable().openapi({ example: null }),
    usuario_id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    treinador_id: z.string().uuid().nullable().openapi({ example: '550e8400-e29b-41d4-a716-446655440002' }),
    dias_semana: z
        .array(z.enum(['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO']))
        .nullable()
        .openapi({ example: ['SEGUNDA', 'QUARTA'] }),
    ordem: z.number().nullable().openapi({ example: 1 }),
}).openapi('Treino');

const TreinoIdParam = z.object({
    id: z.string().uuid().openapi({ description: 'UUID do treino', example: '550e8400-e29b-41d4-a716-446655440010' }),
});

const TreinoExercicioResponse = z.object({
    id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440020' }),
    series: z.number().openapi({ example: 4 }),
    repeticoes: z.string().openapi({ example: '8-12' }),
    carga_sugerida: z.string().nullable().openapi({ example: '30.00' }),
    tempo_descanso_segundos: z.number().openapi({ example: 90 }),
    ordem_execucao: z.number().openapi({ example: 1 }),
    exercicio: z.object({
        id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440030' }),
        nome: z.string().openapi({ example: 'Supino Reto' }),
        descricao: z.string().nullable().openapi({ example: 'Exercício para peitorais' }),
        musculos: z.array(
            z.object({
                musculo_id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440040' }),
                nome: z.string().openapi({ example: 'Peitoral Maior' }),
                grupo_muscular: z.string().openapi({ example: 'PEITO' }),
                tipo_ativacao: z.enum(['PRIMARIO', 'SECUNDARIO']).openapi({ example: 'PRIMARIO' }),
            }),
        ).optional(),
        aparelhos: z.array(
            z.object({
                aparelho_id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440050' }),
                nome: z.string().openapi({ example: 'Banco Reto' }),
                descricao: z.string().openapi({ example: 'Banco de apoio para supino' }),
            }),
        ).optional(),
    }),
});

const TreinoDetalhadoResponse = TreinoResponse.extend({
    exercicios: z.array(TreinoExercicioResponse),
});

const TreinoListResponse = z.object({
    dados: z.array(z.union([TreinoResponse, TreinoDetalhadoResponse])),
    total: z.number().openapi({ example: 12 }),
    page: z.number().openapi({ example: 1 }),
    limite: z.number().openapi({ example: 10 }),
    totalPages: z.number().openapi({ example: 2 }),
});

// POST /treinos
treinoRegistry.registerPath({
    method: 'post',
    path: '/treinos',
    summary: 'Criar treino',
    description: 'Cria um novo treino. Pode ser criado sem exercícios ou já com composição inicial. Aluno pode criar apenas treino próprio; treinador/admin podem criar para qualquer aluno existente. O treinador criador é vinculado automaticamente.',
    tags: ['Treino'],
    security: [{ BearerAuth: [] }],
    request: {
        body: {
            required: true,
            content: {
                'application/json': { schema: treinoSchema },
            },
        },
    },
    responses: {
        201: {
            description: 'Treino criado com sucesso',
            content: {
                'application/json': {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 201 }),
                        message: z.string().nullable().openapi({ example: 'Recurso criado com sucesso' }),
                        data: TreinoDetalhadoResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: 'Não autorizado' },
        403: { description: 'Sem permissão para criar treino para outro aluno' },
        404: { description: 'Aluno não encontrado' },
        422: { description: 'Erro de validação' },
    },
});

// GET /treinos/{id}
treinoRegistry.registerPath({
    method: 'get',
    path: '/treinos/{id}',
    summary: 'Buscar treino por ID',
    description: 'Retorna um treino com seus exercícios. Suporta filtros por nome/grupo muscular/tipo de ativação, ordenação e populates opcionais. Use `incluir_treino_inativo=true` para buscar treinos arquivados. Acesso permitido ao aluno dono, treinador vinculado ou admin.',
    tags: ['Treino'],
    security: [{ BearerAuth: [] }],
    request: {
        params: TreinoIdParam,
        query: treinoDetalheQuerySchema,
    },
    responses: {
        200: {
            description: 'Treino encontrado',
            content: {
                'application/json': {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: TreinoDetalhadoResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: 'Não autorizado' },
        403: { description: 'Sem permissão para visualizar este treino' },
        404: { description: 'Treino não encontrado' },
        422: { description: 'ID inválido' },
    },
});

// GET /treinos
treinoRegistry.registerPath({
    method: 'get',
    path: '/treinos',
    summary: 'Listar treinos',
    description: 'Lista treinos com paginação e filtros. Use `incluir_inativos=true` para incluir treinos arquivados (soft-deleted). Filtros de exercício restringem os treinos retornados aos que possuem match. Aluno vê apenas seus treinos; treinador vê apenas os seus; admin vê todos.',
    tags: ['Treino'],
    security: [{ BearerAuth: [] }],
    request: {
        query: treinoListQuerySchema,
    },
    responses: {
        200: {
            description: 'Lista paginada de treinos',
            content: {
                'application/json': {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: TreinoListResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: 'Não autorizado' },
        403: { description: 'Sem permissão para listar treinos com os filtros informados' },
        422: { description: 'Parâmetros de query inválidos' },
    },
});

// PATCH /treinos/{id}
treinoRegistry.registerPath({
    method: 'patch',
    path: '/treinos/{id}',
    summary: 'Atualizar treino',
    description: 'Atualiza parcialmente um treino e sua composição de exercícios. Permite: alterar nome/descricao, associar/desvincular treinador via `treinador_id` (null para desvincular), adicionar novos exercícios, atualizar dados de exercícios existentes (séries, carga, repetições etc.) e remover exercícios por ID.',
    tags: ['Treino'],
    security: [{ BearerAuth: [] }],
    request: {
        params: TreinoIdParam,
        body: {
            required: true,
            content: {
                'application/json': { schema: treinoUpdateSchema },
            },
        },
    },
    responses: {
        200: {
            description: 'Treino atualizado com sucesso',
            content: {
                'application/json': {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: TreinoDetalhadoResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: 'Não autorizado' },
        403: { description: 'Sem permissão para atualizar este treino' },
        404: { description: 'Treino ou treinador não encontrado' },
        422: { description: 'Parâmetros de rota/body inválidos' },
    },
});

// DELETE /treinos/{id}
treinoRegistry.registerPath({
    method: 'delete',
    path: '/treinos/{id}',
    summary: 'Remover treino',
    description: 'Remove um treino. Por padrão realiza soft delete (marca deletado_em), preservando o histórico. Com ?force=true (somente admin), realiza hard delete em cascata removendo permanentemente o treino e todos os exercícios vinculados. Acesso permitido ao aluno dono, treinador vinculado ou admin.',
    tags: ['Treino'],
    security: [{ BearerAuth: [] }],
    request: {
        params: TreinoIdParam,
        query: treinoDeleteQuerySchema,
    },
    responses: {
        200: {
            description: 'Treino removido com sucesso',
            content: {
                'application/json': {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: z.object({
                            treino: TreinoResponse,
                            tipo_exclusao: z.enum(['soft', 'hard']).openapi({ example: 'soft' }),
                        }),
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: 'Não autorizado' },
        403: { description: 'Sem permissão para excluir este treino' },
        404: { description: 'Treino não encontrado' },
        422: { description: 'ID inválido' },
    },
});
