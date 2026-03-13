import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { exercicioSchema, exercicioUpdateSchema, exercicioQuerySchema } from "../utils/validations/exercicioValidation";

export const exercicioRegistry = new OpenAPIRegistry();

const idParam = z.object({
    id: z.string().uuid().openapi({ description: "UUID do exercício", example: "550e8400-e29b-41d4-a716-446655440000" }),
});

const ExercicioResponse = z.object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    nome: z.string().openapi({ example: "Supino Reto" }),
    descricao: z.string().nullable().openapi({ example: "Exercício para peitorais" }),
    aluno_id: z.string().uuid().nullable().openapi({ example: null }),
    musculos: z.array(z.object({
        musculo_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440001" }),
        tipo_ativacao: z.string().openapi({ example: "PRIMARIO" }),
    })).openapi({ description: "Músculos associados" }),
}).openapi("Exercicio");

// POST /exercicios
exercicioRegistry.registerPath({
    method: "post",
    path: "/exercicios",
    summary: "Criar exercício",
    description: "Cria um novo exercício. Requer autenticação.",
    tags: ["Exercicio"],
    security: [{ BearerAuth: [] }],
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: exercicioSchema },
            },
        },
    },
    responses: {
        201: {
            description: "Exercício criado com sucesso",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 201 }),
                        message: z.string().nullable().openapi({ example: "Recurso criado com sucesso" }),
                        data: ExercicioResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        409: { description: "Já existe um exercício com este nome" },
        422: { description: "Erro de validação" },
    },
});

// GET /exercicios
exercicioRegistry.registerPath({
    method: "get",
    path: "/exercicios",
    summary: "Listar exercícios",
    description: "Lista exercícios com paginação e filtros. Requer autenticação.",
    tags: ["Exercicio"],
    security: [{ BearerAuth: [] }],
    request: {
        query: exercicioQuerySchema,
    },
    responses: {
        200: {
            description: "Lista de exercícios",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: z.any(),
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        422: { description: "Erro de validação nos query params" },
    },
});

// GET /exercicios/{id}
exercicioRegistry.registerPath({
    method: "get",
    path: "/exercicios/{id}",
    summary: "Buscar exercício por ID",
    description: "Retorna um exercício pelo ID. Requer autenticação.",
    tags: ["Exercicio"],
    security: [{ BearerAuth: [] }],
    request: {
        params: idParam,
    },
    responses: {
        200: {
            description: "Exercício encontrado",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: ExercicioResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        404: { description: "Exercício não encontrado" },
        422: { description: "ID inválido" },
    },
});

// PATCH /exercicios/{id}
exercicioRegistry.registerPath({
    method: "patch",
    path: "/exercicios/{id}",
    summary: "Atualizar exercício",
    description: "Atualiza um exercício existente. Requer autenticação.",
    tags: ["Exercicio"],
    security: [{ BearerAuth: [] }],
    request: {
        params: idParam,
        body: {
            required: true,
            content: {
                "application/json": { schema: exercicioUpdateSchema },
            },
        },
    },
    responses: {
        200: {
            description: "Exercício atualizado com sucesso",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: ExercicioResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        400: { description: "Corpo da requisição é obrigatório" },
        401: { description: "Não autorizado" },
        404: { description: "Exercício não encontrado" },
        409: { description: "Já existe um exercício com este nome" },
        422: { description: "Erro de validação" },
    },
});
