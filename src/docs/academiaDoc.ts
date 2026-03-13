import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { academiaSchema, academiaUpdateSchema } from "../utils/validations/academiaValidation";

export const academiaRegistry = new OpenAPIRegistry();

const idParam = z.object({
    id: z.string().uuid().openapi({ description: "UUID da academia", example: "550e8400-e29b-41d4-a716-446655440000" }),
});

const AcademiaResponse = z.object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    nome: z.string().openapi({ example: "Academia Fitness" }),
    endereco_numero: z.string().openapi({ example: "123" }),
    endereco_rua: z.string().openapi({ example: "Rua das Flores" }),
    endereco_bairro: z.string().openapi({ example: "Centro" }),
    endereco_cidade: z.string().openapi({ example: "São Paulo" }),
    endereco_estado: z.string().openapi({ example: "SP" }),
    created_at: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
}).openapi("Academia");

const CommonErrorResponse = z.object({
    error: z.boolean().openapi({ example: true }),
    code: z.number().openapi({ example: 422 }),
    message: z.string().nullable().openapi({ example: "Entidade não processável" }),
    data: z.null(),
    errors: z.array(z.any()),
}).openapi("ErrorResponse");

// POST /academia
academiaRegistry.registerPath({
    method: "post",
    path: "/academia",
    summary: "Criar academia",
    description: "Cria uma nova academia. Requer autenticação e permissão de administrador.",
    tags: ["Academia"],
    security: [{ BearerAuth: [] }],
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: academiaSchema },
            },
        },
    },
    responses: {
        201: {
            description: "Academia criada com sucesso",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 201 }),
                        message: z.string().nullable().openapi({ example: "Recurso criado com sucesso" }),
                        data: AcademiaResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        403: { description: "Acesso negado — permissão de administrador necessária" },
        422: {
            description: "Erro de validação",
            content: {
                "application/json": { schema: CommonErrorResponse },
            },
        },
    },
});

// GET /academia
academiaRegistry.registerPath({
    method: "get",
    path: "/academia",
    summary: "Listar academias",
    description: "Retorna todas as academias. Requer autenticação.",
    tags: ["Academia"],
    security: [{ BearerAuth: [] }],
    responses: {
        200: {
            description: "Lista de academias",
            content: {
                "application/json": {
                    schema: z.array(AcademiaResponse),
                },
            },
        },
        401: { description: "Não autorizado" },
    },
});

// GET /academia/{id}
academiaRegistry.registerPath({
    method: "get",
    path: "/academia/{id}",
    summary: "Buscar academia por ID",
    description: "Retorna uma academia pelo ID. Requer autenticação.",
    tags: ["Academia"],
    security: [{ BearerAuth: [] }],
    request: {
        params: idParam,
    },
    responses: {
        200: {
            description: "Academia encontrada",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: AcademiaResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        404: { description: "Academia não encontrada" },
    },
});

// PATCH /academia/{id}
academiaRegistry.registerPath({
    method: "patch",
    path: "/academia/{id}",
    summary: "Atualizar academia",
    description: "Atualiza uma academia existente. Requer autenticação e permissão de administrador.",
    tags: ["Academia"],
    security: [{ BearerAuth: [] }],
    request: {
        params: idParam,
        body: {
            required: true,
            content: {
                "application/json": { schema: academiaUpdateSchema },
            },
        },
    },
    responses: {
        200: {
            description: "Academia atualizada com sucesso",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: AcademiaResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        403: { description: "Acesso negado — permissão de administrador necessária" },
        422: {
            description: "Erro de validação",
            content: {
                "application/json": { schema: CommonErrorResponse },
            },
        },
    },
});

// DELETE /academia/{id}
academiaRegistry.registerPath({
    method: "delete",
    path: "/academia/{id}",
    summary: "Deletar academia",
    description: "Remove uma academia pelo ID. Requer autenticação e permissão de administrador.",
    tags: ["Academia"],
    security: [{ BearerAuth: [] }],
    request: {
        params: idParam,
    },
    responses: {
        200: { description: "Academia removida com sucesso" },
        401: { description: "Não autorizado" },
        403: { description: "Acesso negado — permissão de administrador necessária" },
    },
});
