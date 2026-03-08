import { z } from 'zod';

const exercicioSchema = z.object({
    nome: z
        .string()
        .min(1, { message: "O nome do exercício é obrigatório" })
        .max(255, { message: "O nome do exercício deve ter no máximo 255 caracteres" }),
    descricao: z
        .string()
        .max(1000, { message: "A descrição deve ter no máximo 1000 caracteres" })
        .nullable()
        .optional(),
    aluno_id: z
        .string()
        .uuid({ message: "O ID do aluno deve ser um UUID válido" })
        .nullable()
        .optional(),
    musculos: z
        .array(z.object({
            musculo_id: z.string().uuid({ message: "O ID do músculo deve ser um UUID válido" }),
            tipo_ativacao: z.enum(['PRIMARIO', 'SECUNDARIO'], { message: "Tipo de ativação deve ser 'PRIMARIO' ou 'SECUNDARIO'" }),
        }).strict())
        .min(1, { message: "É obrigatório informar ao menos um músculo associado" }),
}).strict();

export { exercicioSchema};