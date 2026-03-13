import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { alunoSchema } from "../utils/validations/alunoValidation";

export const alunoRegistry = new OpenAPIRegistry();

const idParam = z.object({
    id: z.string().uuid().openapi({ description: "UUID do aluno", example: "550e8400-e29b-41d4-a716-446655440000" }),
});

const AlunoResponse = z.object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    user_id: z.string().openapi({ example: "user_abc123" }),
    nome: z.string().openapi({ example: "João Silva" }),
    data_nascimento: z.string().openapi({ example: "2000-01-15" }),
    sexo: z.string().openapi({ example: "M" }),
    url_foto: z.string().nullable().openapi({ example: "https://example.com/foto.jpg" }),
    status_conta: z.boolean().openapi({ example: true }),
    academia_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
}).openapi("Aluno");

// GET /alunos
alunoRegistry.registerPath({
    method: "get",
    path: "/alunos",
    summary: "Listar alunos",
    description: "Retorna todos os alunos cadastrados.",
    tags: ["Aluno"],
    responses: {
        200: {
            description: "Lista de alunos",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable().openapi({ example: "2 aluno(s) encontrado(s)" }),
                        data: z.object({
                            total: z.number().openapi({ example: 2 }),
                            alunos: z.array(AlunoResponse),
                        }),
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
    },
});

// GET /alunos/{id}
alunoRegistry.registerPath({
    method: "get",
    path: "/alunos/{id}",
    summary: "Buscar aluno por ID",
    description: "Retorna um aluno pelo ID.",
    tags: ["Aluno"],
    request: {
        params: idParam,
    },
    responses: {
        200: {
            description: "Aluno encontrado",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable().openapi({ example: "Aluno encontrado com sucesso" }),
                        data: AlunoResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        404: { description: "Aluno não encontrado" },
        422: { description: "ID inválido" },
    },
});

// POST /alunos
alunoRegistry.registerPath({
    method: "post",
    path: "/alunos",
    summary: "Criar aluno",
    description: "Cria um novo aluno.",
    tags: ["Aluno"],
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: alunoSchema },
            },
        },
    },
    responses: {
        201: {
            description: "Aluno criado com sucesso",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 201 }),
                        message: z.string().nullable().openapi({ example: "Recurso criado com sucesso" }),
                        data: AlunoResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        400: { description: "Dados obrigatórios ausentes" },
        422: { description: "Erro de validação" },
    },
});
