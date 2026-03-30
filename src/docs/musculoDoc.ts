import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { musculoQuerySchema } from "../utils/validations/musculoValidation";

export const musculoRegistry = new OpenAPIRegistry();

const idParam = z.object({
    id: z.string().uuid().openapi({ description: "UUID do músculo", example: "550e8400-e29b-41d4-a716-446655440000" }),
});

const MusculoResponse = z.object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    nome: z.string().openapi({ example: "Peitoral Maior" }),
    grupo_muscular: z.string().openapi({ example: "PEITO" }),
}).openapi("Musculo");

const MusculoComExerciciosResponse = MusculoResponse.extend({
    exercicios: z.array(z.object({
        exercicio_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440001" }),
        nome: z.string().openapi({ example: "Supino Reto" }),
        descricao: z.string().nullable().openapi({ example: "Exercício para peitorais" }),
        tipo_ativacao: z.enum(['PRIMARIO', 'SECUNDARIO']).openapi({ example: "PRIMARIO" }),
    })).openapi({ description: "Exercícios vinculados a este músculo (apenas não deletados)" }),
}).openapi("MusculoComExercicios");

// GET /musculos
musculoRegistry.registerPath({
    method: "get",
    path: "/musculos",
    summary: "Listar músculos",
    description: `Lista músculos com paginação, filtros e ordenação.

**Filtros:**
- \`nome\`: busca parcial, case e accent insensitive (ex: "triceps" encontra "Tríceps Braquial")
- \`grupo_muscular\`: aceita variações de caixa e acentos ("peito", "PEITO", "bracos", "BRAÇOS")

**Ordenação (\`ordem\`):**
- \`nome_asc\` (padrão): A → Z
- \`nome_desc\`: Z → A
- \`popularidade_desc\`: mais exercícios ativos vinculados primeiro

**Contagem por grupo (\`incluir_contagem_grupo=true\`):**
Retorna \`contagem_por_grupo\` com o total de músculos por grupo (para chips/filtros com badge na UI). A contagem reflete o universo completo, independente do filtro de nome.`,
    tags: ["Musculo"],
    security: [{ BearerAuth: [] }],
    request: {
        query: musculoQuerySchema,
    },
    responses: {
        200: {
            description: "Lista paginada de músculos",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: z.object({
                            dados: z.array(MusculoResponse),
                            total: z.number().openapi({ example: 24 }),
                            page: z.number().openapi({ example: 1 }),
                            limite: z.number().openapi({ example: 20 }),
                            totalPages: z.number().openapi({ example: 2 }),
                            contagem_por_grupo: z.record(z.string(), z.number())
                                .nullable()
                                .optional()
                                .openapi({
                                    description: "Presente apenas quando incluir_contagem_grupo=true",
                                    example: { PEITO: 3, COSTAS: 5, PERNAS: 4, BRAÇOS: 6, OMBROS: 3, ABDOMEN: 2 },
                                }),
                        }),
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        422: { description: "Erro de validação nos query params" },
    },
});

// GET /musculos/{id}
musculoRegistry.registerPath({
    method: "get",
    path: "/musculos/{id}",
    summary: "Buscar músculo por ID",
    description: "Retorna um músculo pelo ID com a lista de exercícios ativos vinculados (via exercicio_musculo). Exercícios com soft delete são excluídos.",
    tags: ["Musculo"],
    security: [{ BearerAuth: [] }],
    request: {
        params: idParam,
    },
    responses: {
        200: {
            description: "Músculo encontrado",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable(),
                        data: MusculoComExerciciosResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        404: { description: "Músculo não encontrado" },
        422: { description: "ID inválido" },
    },
});
