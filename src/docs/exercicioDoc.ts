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
    deletado_em: z.coerce.date().nullable().openapi({ example: null }),
    musculos: z.array(z.object({
        musculo_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440001" }),
        tipo_ativacao: z.enum(['PRIMARIO', 'SECUNDARIO']).openapi({ example: "PRIMARIO" }),
        nome: z.string().openapi({ example: "Peitoral Maior" }),
        grupo_muscular: z.string().openapi({ example: "PEITO" }),
    })).openapi({ description: "Músculos associados" }),
}).openapi("Exercicio");

// POST /exercicios
exercicioRegistry.registerPath({
    method: "post",
    path: "/exercicios",
    summary: "Criar exercício",
    description: "Cria um novo exercício. Admin pode criar exercícios globais (sem `aluno_id`). Aluno pode criar exercícios pessoais apenas para si mesmo. Treinador pode criar exercícios pessoais para qualquer aluno existente.",
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
    description: "Lista exercícios com paginação e filtros. Escopo GLOBAL=apenas globais, PESSOAL=apenas pessoais do aluno, TODOS=ambos. Use `incluir_inativos=true` (somente admin) para incluir exercícios desativados. Use `incluir_musculos=false` para resposta mais leve.",
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
    description: "Atualiza parcialmente um exercício. Ao informar `musculos`, a lista completa de vínculos musculares é substituída — envie todos os músculos desejados, não apenas os novos. Exercícios globais: somente admin. Exercícios pessoais: dono (aluno), treinador ou admin.",
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
        401: { description: "Não autorizado" },
        403: { description: "Sem permissão para editar este exercício" },
        404: { description: "Exercício não encontrado" },
        409: { description: "Já existe um exercício com este nome" },
        422: { description: "Erro de validação (incluindo corpo vazio ou sem campos)" },
    },
});

// DELETE /exercicios/{id}
exercicioRegistry.registerPath({
    method: "delete",
    path: "/exercicios/{id}",
    summary: "Deletar exercício",
    description: `Remove um exercício pelo ID. Requer autenticação.

**Comportamento padrão:** Remove permanentemente o exercício se ele não estiver vinculado a nenhuma rotina de treino.

**Quando o exercício está vinculado a rotinas:**
- \`?soft=true\` — Desativa o exercício sem removê-lo (soft delete). As rotinas existentes são preservadas.
- \`?force=true\` — Exclui permanentemente o exercício junto com todas as rotinas vinculadas. **Requer perfil admin.**

Se nenhum parâmetro for informado e o exercício estiver vinculado, a requisição retornará erro 409.`,
    tags: ["Exercicio"],
    security: [{ BearerAuth: [] }],
    request: {
        params: idParam,
        query: z.object({
            soft: z.enum(["true", "false"]).optional().openapi({
                description: "Se `true`, desativa o exercício sem remover do banco (soft delete). As rotinas vinculadas são preservadas.",
                example: "true",
            }),
            force: z.enum(["true", "false"]).optional().openapi({
                description: "Se `true`, exclui permanentemente o exercício e todas as rotinas vinculadas. **Requer perfil admin.**",
                example: "false",
            }),
        }),
    },
    responses: {
        200: {
            description: "Exercício removido com sucesso",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable().openapi({ example: "Exercício removido com sucesso" }),
                        data: z.object({
                            exercicio: ExercicioResponse,
                            tipo_exclusao: z.enum(["soft", "hard", "cascade"]).openapi({
                                description: "Tipo de exclusão realizada",
                                example: "hard",
                            }),
                        }),
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        403: { description: "Sem permissão para deletar este exercício" },
        404: { description: "Exercício não encontrado" },
        409: { description: "Exercício está vinculado a rotinas. Use ?soft=true ou ?force=true (admin)" },
        422: { description: "ID inválido" },
    },
});

