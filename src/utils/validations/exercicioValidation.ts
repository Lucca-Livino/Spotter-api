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

const exercicioQuerySchema = z.object({
    nome: z
        .string()
        .optional(),
    grupo_muscular: z
        .enum(['PEITO', 'COSTAS', 'PERNAS', 'BRAÇOS', 'OMBROS', 'ABDOMEN'])
        .optional(),
    aluno_id: z
        .string()
        .uuid({ message: 'aluno_id deve ser um UUID válido' })
        .optional(),
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => Number.isInteger(val) && val > 0, {
            message: 'page deve ser um número inteiro maior que 0',
        }),
    limite: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, {
            message: 'limite deve ser entre 1 e 100',
        }),
});

const exercicioIdSchema = z
    .string()
    .uuid('ID inválido, deve ser um UUID válido');

export { exercicioSchema, exercicioQuerySchema, exercicioIdSchema };