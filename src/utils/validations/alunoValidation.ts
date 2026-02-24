import { z } from 'zod';

const alunoSchema = z.object({
    nome: z
        .string()
        .min(1, { message: "O nome é obrigatório" }),
    email: z
        .string()
        .min(1, { message: "O email é obrigatório" }),
    senha: z
        .string()
        .min(1, { message: "A senha é obrigatória" }),
    data_nascimento: z
        .iso.date(),
    sexo: z
        .enum(["M", "F"], { message: "Genero deve ser 'M' para 'Masculino' e 'F' para 'Feminino'" }),
    status_conta: z
        .optional(z.boolean()),
    academia_id: z
        .int({ message: "O ID da academia é obrigatório" })
        .min(1, { message: "O aluno deve estar vinculado a uma academia válida" }),
});

const alunoUpdateSchema = alunoSchema.partial()

export { alunoSchema, alunoUpdateSchema }