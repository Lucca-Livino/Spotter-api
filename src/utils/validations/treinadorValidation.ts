import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const treinadorIdSchema = z
	.string()
	.uuid({ message: "ID deve ser um UUID válido" })
	.openapi({
		description: "UUID do treinador",
		example: "550e8400-e29b-41d4-a716-446655440000",
	});

const treinadorCreateBaseSchema = z
	.object({
		nome: z
			.string()
			.min(1, { message: "O nome é obrigatório" })
			.openapi({ description: "Nome do treinador", example: "Marcos Antônio Rocha" }),
		data_nascimento: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, {
				message: "Data de nascimento deve estar no formato YYYY-MM-DD",
			})
			.refine((date) => {
				const [year, month, day] = date.split("-").map(Number);
				const parsedDate = new Date(year, month - 1, day);
				return (
					parsedDate.getFullYear() === year &&
					parsedDate.getMonth() === month - 1 &&
					parsedDate.getDate() === day
				);
			}, { message: "Data de nascimento inválida" })
			.openapi({ description: "Data de nascimento (YYYY-MM-DD)", example: "1985-01-20" }),
		sexo: z
			.enum(["M", "F"], {
				message: "Sexo deve ser 'M' para 'Masculino' ou 'F' para 'Feminino'",
			})
			.openapi({ description: "Sexo do treinador", example: "M" }),
		cref: z
			.string()
			.min(1, { message: "O CREF é obrigatório" })
			.openapi({ description: "Registro profissional do treinador", example: "012345-G/RO" }),
		turnos: z
			.array(z.enum(["MANHA", "TARDE", "NOITE"]))
			.min(1, { message: "É necessário informar ao menos um turno" })
			.openapi({ description: "Turnos de atendimento", example: ["MANHA", "TARDE"] }),
		especializacao: z
			.string()
			.min(1, { message: "A especialização é obrigatória" })
			.openapi({ description: "Especialização do treinador", example: "Hipertrofia e Força" }),
		graduacao: z
			.string()
			.min(1, { message: "A graduação é obrigatória" })
			.openapi({ description: "Graduação do treinador", example: "Educação Física - Bacharel" }),
		url_foto: z
		        .string()
		        .url({ message: "A URL da foto deve ser válida" })
		        .max(255, { message: "A URL da foto deve ter no máximo 255 caracteres" })
		        .optional()
		        .nullable()
		        .openapi({ description: "URL da foto do treinador", example: "https://example.com/foto.jpg" }),

		status_conta: z
			.boolean()
			.optional()
			.default(true)
			.openapi({ description: "Status da conta (ativa/inativa)", example: true }),
		academia_id: z
			.string()
			.uuid({ message: "O ID da academia deve ser um UUID válido" })
			.openapi({ description: "UUID da academia", example: "550e8400-e29b-41d4-a716-446655440001" }),
	});

const treinadorCreateSchema = treinadorCreateBaseSchema.openapi("TreinadorCreateInput");

const treinadorUpdateSchema = treinadorCreateBaseSchema
	.partial()
	.openapi("TreinadorUpdateInput");

const treinadorSchema = treinadorCreateBaseSchema
	.extend({
		user_id: z
			.string()
			.min(1, { message: "O user_id é obrigatório" })
			.openapi({ description: "ID do usuário vinculado", example: "user_abc123" }),
	})
	.openapi("TreinadorInput");

const treinadorQuerySchema = z.object({
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
}).strict().openapi("TreinadorQuery");

export {
	treinadorIdSchema,
	treinadorSchema,
	treinadorCreateSchema,
	treinadorUpdateSchema,
	treinadorQuerySchema,
};
