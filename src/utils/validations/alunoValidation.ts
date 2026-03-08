import { z } from 'zod';

const studentIdSchema = z.coerce.number().int().positive({ message: "ID deve ser um número inteiro positivo" });

const studentSchema = z.object({
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
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data de nascimento deve estar no formato YYYY-MM-DD" })
        .refine((date) => {
            const [year, month, day] = date.split('-').map(Number);
            const parsedDate = new Date(year, month - 1, day);
            return parsedDate.getFullYear() === year && 
                   parsedDate.getMonth() === month - 1 && 
                   parsedDate.getDate() === day;
        }, { message: "Data de nascimento inválida" }),
    sexo: z
        .enum(["M", "F"], { message: "Sexo deve ser 'M' para 'Masculino' ou 'F' para 'Feminino'" }),
    url_foto: z
        .string()
        .optional()
        .nullable(),
    status_conta: z
        .boolean()
        .optional()
        .default(true),
    academia_id: z
        .number()
        .int({ message: "O ID da academia deve ser um número inteiro" })
        .positive({ message: "O aluno deve estar vinculado a uma academia válida" }),
});

const studentUpdateSchema = studentSchema.partial();

const physicalDataSchema = z.object({
    peso_kg: z
        .number()
        .positive({ message: "Peso deve ser um número positivo" })
        .max(500, { message: "Peso não pode exceder 500 kg" }),
    altura_m: z
        .number()
        .positive({ message: "Altura deve ser um número positivo" })
        .max(3, { message: "Altura não pode exceder 3 metros" }),
});

const physicalDataUpdateSchema = physicalDataSchema.partial();

export { studentIdSchema, studentSchema, studentUpdateSchema, physicalDataSchema, physicalDataUpdateSchema };
