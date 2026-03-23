import { z } from 'zod';
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const sessaoSchema = z.object({
    treino_id: z
        .string()
        .uuid({ message: "O ID do treino deve ser um UUID válido" })
        .openapi({ description: "UUID do treino a ser iniciado", example: "550e8400-e29b-41d4-a716-446655440000" }),
}).strict().openapi("SessaoInput");

const sessaoIdSchema = z
    .string()
    .uuid('ID inválido, deve ser um UUID válido')
    .openapi({ description: "UUID da sessão", example: "550e8400-e29b-41d4-a716-446655440000" });

export { sessaoSchema, sessaoIdSchema };
