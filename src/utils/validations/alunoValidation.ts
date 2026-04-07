import { z } from 'zod';
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const alunoIdSchema = z.string().uuid({ message: "ID deve ser um UUID válido" })
    .openapi({ description: "UUID do aluno", example: "550e8400-e29b-41d4-a716-446655440000" });

const alunoSchema = z.object({
    user_id: z
        .string()
        .min(1, { message: "O user_id é obrigatório" })
        .openapi({ description: "ID do usuário vinculado", example: "user_abc123" }),
    nome: z
        .string()
        .min(1, { message: "O nome é obrigatório" })
        .openapi({ description: "Nome do aluno", example: "João Silva" }),
    data_nascimento: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data de nascimento deve estar no formato YYYY-MM-DD" })
        .refine((date) => {
            const [year, month, day] = date.split('-').map(Number);
            const parsedDate = new Date(year, month - 1, day);
            return parsedDate.getFullYear() === year &&
                   parsedDate.getMonth() === month - 1 &&
                   parsedDate.getDate() === day;
        }, { message: "Data de nascimento inválida" })
        .openapi({ description: "Data de nascimento (YYYY-MM-DD)", example: "2000-01-15" }),
    sexo: z
        .enum(["M", "F"], { message: "Sexo deve ser 'M' para 'Masculino' ou 'F' para 'Feminino'" })
        .openapi({ description: "Sexo do aluno", example: "M" }),
    url_foto: z
        .string()
        .optional()
        .nullable()
        .openapi({ description: "URL da foto do aluno", example: "https://example.com/foto.jpg" }),
    status_conta: z
        .boolean()
        .optional()
        .default(true)
        .openapi({ description: "Status da conta (ativa/inativa)", example: true }),
    academia_id: z
        .string()
        .uuid({ message: "O ID da academia deve ser um UUID válido" })
        .openapi({ description: "UUID da academia", example: "550e8400-e29b-41d4-a716-446655440000" }),
    treinador_id: z
        .string()
        .uuid({ message: "O ID do treinador deve ser um UUID válido" })
        .nullable()
        .optional()
        .openapi({
            description: "UUID do treinador vinculado ao aluno (opcional)",
            example: "550e8400-e29b-41d4-a716-446655440002",
        }),
}).openapi("AlunoInput");

const alunoUpdateSchema = alunoSchema.partial().openapi("AlunoUpdateInput");

const physicalDataSchema = z.object({
    peso_kg: z
        .number()
        .positive({ message: "Peso deve ser um número positivo" })
        .max(500, { message: "Peso não pode exceder 500 kg" })
        .openapi({ description: "Peso em kg", example: 75.5 }),
    altura_m: z
        .number()
        .positive({ message: "Altura deve ser um número positivo" })
        .max(3, { message: "Altura não pode exceder 3 metros" })
        .openapi({ description: "Altura em metros", example: 1.75 }),
}).openapi("PhysicalDataInput");

const physicalDataUpdateSchema = physicalDataSchema.partial().openapi("PhysicalDataUpdateInput");

const alunoQuerySchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => Number.isInteger(val) && val > 0, { message: 'page deve ser maior que 0' })
        .openapi({ description: "Número da página", example: "1" }),
    limite: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, { message: 'limite deve ser entre 1 e 100' })
        .openapi({ description: "Limite de resultados por página (máx. 100)", example: "10" }),
}).strict().openapi("AlunoQuery");

export { alunoIdSchema, alunoSchema, alunoUpdateSchema, alunoQuerySchema, physicalDataSchema, physicalDataUpdateSchema };
