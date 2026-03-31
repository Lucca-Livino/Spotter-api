import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  treinadorCreateSchema,
  treinadorIdSchema,
  treinadorQuerySchema,
} from "../utils/validations/treinadorValidation";

export const treinadorRegistry = new OpenAPIRegistry();

const idParam = z.object({ id: treinadorIdSchema });

const TreinadorResponse = z
  .object({
    id: z
      .string()
      .uuid()
      .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    user_id: z.string().openapi({ example: "user_abc123" }),
    nome: z.string().openapi({ example: "Marcos Antônio Rocha" }),
    data_nascimento: z.string().openapi({ example: "1985-01-20" }),
    sexo: z.string().openapi({ example: "M" }),
    cref: z.string().openapi({ example: "012345-G/RO" }),
    turnos: z
      .array(z.enum(["MANHA", "TARDE", "NOITE"]))
      .openapi({ example: ["MANHA", "TARDE"] }),
    especializacao: z.string().openapi({ example: "Hipertrofia e Força" }),
    graduacao: z.string().openapi({ example: "Educação Física - Bacharel" }),
    status_conta: z.boolean().openapi({ example: true }),
    academia_id: z
      .string()
      .uuid()
      .openapi({ example: "550e8400-e29b-41d4-a716-446655440001" }),
  })
  .openapi("Treinador");

// GET /treinadores
treinadorRegistry.registerPath({
  method: "get",
  path: "/treinadores",
  summary: "Listar treinadores",
  description: "Retorna treinadores com paginação.",
  tags: ["Treinador"],
  security: [{ BearerAuth: [] }],
  request: { query: treinadorQuerySchema },
  responses: {
    200: {
      description: "Lista paginada de treinadores",
      content: {
        "application/json": {
          schema: z.object({
            error: z.boolean().openapi({ example: false }),
            code: z.number().openapi({ example: 200 }),
            message: z.string().nullable(),
            data: z.object({
              dados: z.array(TreinadorResponse),
              total: z.number().openapi({ example: 5 }),
              page: z.number().openapi({ example: 1 }),
              limite: z.number().openapi({ example: 10 }),
              totalPages: z.number().openapi({ example: 1 }),
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

// GET /treinadores/{id}
treinadorRegistry.registerPath({
  method: "get",
  path: "/treinadores/{id}",
  summary: "Buscar treinador por ID",
  description: "Retorna um treinador pelo ID.",
  tags: ["Treinador"],
  security: [{ BearerAuth: [] }],
  request: {
    params: idParam,
  },
  responses: {
    200: {
      description: "Treinador encontrado",
      content: {
        "application/json": {
          schema: z.object({
            error: z.boolean().openapi({ example: false }),
            code: z.number().openapi({ example: 200 }),
            message: z
              .string()
              .nullable()
              .openapi({ example: "Treinador encontrado com sucesso" }),
            data: TreinadorResponse,
            errors: z.array(z.any()),
          }),
        },
      },
    },
    401: { description: "Não autorizado" },
    404: { description: "Treinador não encontrado" },
    422: { description: "ID inválido" },
  },
});

// POST /treinadores
treinadorRegistry.registerPath({
  method: "post",
  path: "/treinadores",
  summary: "Criar treinador",
  description: "Cria um novo treinador.",
  tags: ["Treinador"],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: treinadorCreateSchema },
      },
    },
  },
  responses: {
    201: {
      description: "Treinador criado com sucesso",
      content: {
        "application/json": {
          schema: z.object({
            error: z.boolean().openapi({ example: false }),
            code: z.number().openapi({ example: 201 }),
            message: z
              .string()
              .nullable()
              .openapi({ example: "Recurso criado com sucesso" }),
            data: TreinadorResponse,
            errors: z.array(z.any()),
          }),
        },
      },
    },
    400: { description: "Dados obrigatórios ausentes" },
    401: { description: "Não autorizado" },
    409: { description: "Usuário autenticado já possui perfil de treinador" },
    422: { description: "Erro de validação" },
  },
});
