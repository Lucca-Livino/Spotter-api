import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { treinadorIdSchema } from "../utils/validations/treinadorValidation";

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
  description: "Retorna todos os treinadores cadastrados.",
  tags: ["Treinador"],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: "Lista de treinadores",
      content: {
        "application/json": {
          schema: z.object({
            error: z.boolean().openapi({ example: false }),
            code: z.number().openapi({ example: 200 }),
            message: z
              .string()
              .nullable()
              .openapi({ example: "2 treinador(es) encontrado(s)" }),
            data: z.object({
              total: z.number().openapi({ example: 2 }),
              treinadores: z.array(TreinadorResponse),
            }),
            errors: z.array(z.any()),
          }),
        },
      },
    },
    401: { description: "Não autorizado" },
  },
});


