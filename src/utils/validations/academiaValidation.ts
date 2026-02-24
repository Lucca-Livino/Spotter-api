import { z } from "zod";

const academiaSchema = z.object({
    nome: z
        .string()
        .min(1, { message: "O nome da academia é obrigatório" }),
    endereco_numero: z
        .string()
        .min(1, { message: "O número do endereço é obrigatório" })
        .max(20, { message: "O número do endereço deve ter no máximo 20 caracteres" }),
    endereco_rua: z
        .string()
        .min(1, { message: "A rua do endereço é obrigatória" }),
    endereco_bairro: z
        .string()
        .min(1, { message: "O bairro do endereço é obrigatório" }),
    endereco_cidade: z
        .string()
        .min(1, { message: "A cidade do endereço é obrigatória" }),
    endereco_estado: z
        .string()
        .min(1, { message: "O estado do endereço é obrigatório" })
        .max(2, { message: "O estado do endereço deve ter no máximo 2 caracteres" }),
})

const academiaUpdateSchema = academiaSchema.partial();

export { academiaSchema, academiaUpdateSchema }