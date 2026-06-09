import { z } from 'zod';
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const solicitarTreinadorSchema = z.object({
    treinador_id: z
        .string()
        .uuid({ message: "treinador_id deve ser um UUID válido" })
        .openapi({ description: "UUID do treinador", example: "550e8400-e29b-41d4-a716-446655440000" }),
}).openapi("SolicitarTreinadorInput");

export const responderSolicitacaoSchema = z.object({
    status: z.enum(['ACEITA', 'RECUSADA'], { message: "status deve ser 'ACEITA' ou 'RECUSADA'" })
        .openapi({ description: "Resposta do treinador", example: "ACEITA" }),
}).openapi("ResponderSolicitacaoInput");

export const solicitacaoIdSchema = z
    .string()
    .uuid({ message: "ID deve ser um UUID válido" });
