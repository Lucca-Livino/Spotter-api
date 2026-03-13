import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const academiaSchema = z.object({
    nome: z
        .string()
        .min(1, { message: "O nome da academia é obrigatório" })
        .openapi({ description: "Nome da academia", example: "Academia Fitness" }),
    endereco_numero: z
        .string()
        .min(1, { message: "O número do endereço é obrigatório" })
        .max(20, { message: "O número do endereço deve ter no máximo 20 caracteres" })
        .openapi({ description: "Número do endereço", example: "123" }),
    endereco_rua: z
        .string()
        .min(1, { message: "A rua do endereço é obrigatória" })
        .openapi({ description: "Rua do endereço", example: "Rua das Flores" }),
    endereco_bairro: z
        .string()
        .min(1, { message: "O bairro do endereço é obrigatório" })
        .openapi({ description: "Bairro do endereço", example: "Centro" }),
    endereco_cidade: z
        .string()
        .min(1, { message: "A cidade do endereço é obrigatória" })
        .openapi({ description: "Cidade do endereço", example: "São Paulo" }),
    endereco_estado: z
        .string()
        .min(1, { message: "O estado do endereço é obrigatório" })
        .max(2, { message: "O estado do endereço deve ter no máximo 2 caracteres" })
        .openapi({ description: "Estado (UF)", example: "SP" }),
}).openapi("AcademiaInput");

const academiaUpdateSchema = academiaSchema.partial().openapi("AcademiaUpdateInput");

export { academiaSchema, academiaUpdateSchema }
