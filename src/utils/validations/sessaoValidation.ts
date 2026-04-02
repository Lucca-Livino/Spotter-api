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

const sessaoListQuerySchema = z.object({
    aluno_id: z
        .string()
        .uuid({ message: 'aluno_id deve ser um UUID válido' })
        .optional()
        .openapi({ description: 'Filtra sessões por aluno', example: '550e8400-e29b-41d4-a716-446655440001' }),
    treino_id: z
        .string()
        .uuid({ message: 'treino_id deve ser um UUID válido' })
        .optional()
        .openapi({ description: 'Filtra sessões por treino', example: '550e8400-e29b-41d4-a716-446655440004' }),
    status: z
        .enum(['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'])
        .optional()
        .openapi({ description: 'Filtra sessões por status', example: 'CONCLUIDA' }),
    data_inicio: z
        .string()
        .datetime({ message: 'data_inicio deve ser uma data ISO 8601 válida' })
        .optional()
        .openapi({ description: 'Filtra sessões iniciadas a partir desta data (ISO 8601)', example: '2026-03-01T00:00:00.000Z' }),
    data_fim: z
        .string()
        .datetime({ message: 'data_fim deve ser uma data ISO 8601 válida' })
        .optional()
        .openapi({ description: 'Filtra sessões iniciadas até esta data (ISO 8601)', example: '2026-03-31T23:59:59.999Z' }),
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => Number.isInteger(val) && val > 0, { message: 'page deve ser um número inteiro maior que 0' })
        .openapi({ description: 'Número da página', example: '1' }),
    limite: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, { message: 'limite deve ser entre 1 e 100' })
        .openapi({ description: 'Limite de itens por página', example: '10' }),
    ordem_data_inicio: z
        .enum(['asc', 'desc'])
        .default('desc')
        .openapi({ description: 'Ordena por data de início da sessão', example: 'desc' }),
}).strict().openapi('SessaoListQuery');

type SessaoListQuery = z.infer<typeof sessaoListQuerySchema>;

const sessaoUpdateSchema = z.object({
    observacoes: z
        .string()
        .max(1000, { message: 'Observações devem ter no máximo 1000 caracteres' })
        .openapi({ description: "Observações gerais da sessão", example: "Treino pesado, senti dor no ombro direito" }),
}).strict().openapi("SessaoUpdate");

const sessaoExercicioUpdateSchema = z.object({
    concluido: z
        .boolean()
        .openapi({ description: "Marca o exercício como concluído ou não concluído", example: true }),
    observacoes: z
        .string()
        .max(1000, { message: 'Observações devem ter no máximo 1000 caracteres' })
        .nullable()
        .optional()
        .openapi({ description: "Observações sobre o exercício", example: "Consegui manter a forma na última série" }),
    inicio: z
        .string()
        .datetime({ message: 'inicio deve ser ISO 8601 válido' })
        .nullable()
        .optional()
        .openapi({ description: "Timestamp de início do exercício (ISO 8601). Se omitido e concluido=true, o fim é registrado automaticamente", example: "2026-03-31T10:00:00.000Z" }),
    fim: z
        .string()
        .datetime({ message: 'fim deve ser ISO 8601 válido' })
        .nullable()
        .optional()
        .openapi({ description: "Timestamp de fim do exercício (ISO 8601). Se omitido e concluido=true, registrado automaticamente como now()", example: "2026-03-31T10:15:00.000Z" }),
}).strict().openapi("SessaoExercicioUpdate");

const exercicioIdSchema = z
    .string()
    .uuid('ID do exercício inválido, deve ser um UUID válido')
    .openapi({ description: "UUID do exercício da sessão", example: "550e8400-e29b-41d4-a716-446655440005" });

const serieItemSchema = z.object({
    numero_serie: z
        .number({ message: 'numero_serie deve ser um número inteiro positivo' })
        .int({ message: 'numero_serie deve ser um número inteiro' })
        .positive({ message: 'numero_serie deve ser maior que 0' })
        .openapi({ description: "Número da série (começa em 1)", example: 1 }),
    repeticoes_realizadas: z
        .number({ message: 'repeticoes_realizadas deve ser um número inteiro positivo' })
        .int({ message: 'repeticoes_realizadas deve ser um número inteiro' })
        .positive({ message: 'repeticoes_realizadas deve ser maior que 0' })
        .nullable()
        .optional()
        .openapi({ description: "Número de repetições realizadas", example: 12 }),
    carga_utilizada: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, { message: 'carga_utilizada deve ser um número decimal válido (ex: 80 ou 80.50)' })
        .nullable()
        .optional()
        .openapi({ description: "Carga utilizada em kg (decimal)", example: "80.50" }),
    status: z
        .enum(['PENDENTE', 'CONCLUIDA', 'PULADA'], { message: 'status deve ser PENDENTE, CONCLUIDA ou PULADA' })
        .openapi({ description: "Status da série", example: "CONCLUIDA" }),
    observacoes: z
        .string()
        .max(1000, { message: 'observacoes deve ter no máximo 1000 caracteres' })
        .nullable()
        .optional()
        .openapi({ description: "Observações sobre a série", example: "Senti dificuldade na última repetição" }),
}).strict().openapi("SerieItem");

const sessaoSeriesUpdateSchema = z.object({
    series: z
        .array(serieItemSchema, { message: 'series deve ser um array de séries' })
        .min(1, { message: 'series deve conter ao menos uma série' })
        .openapi({ description: "Lista de séries para substituição total" }),
}).strict().superRefine((val, ctx) => {
    const numeros = val.series.map((s) => s.numero_serie);
    const duplicados = numeros.filter((n, i) => numeros.indexOf(n) !== i);
    if (duplicados.length > 0) {
        ctx.addIssue({
            code: 'custom',
            path: ['series'],
            message: `numero_serie deve ser único dentro do array. Duplicados: ${[...new Set(duplicados)].join(', ')}`,
        });
    }
}).openapi("SessaoSeriesUpdate");

type SessaoSeriesUpdate = z.infer<typeof sessaoSeriesUpdateSchema>;

const reordenarExerciciosSchema = z.object({
    exercicios: z
        .array(z.object({
            sessao_exercicio_id: z.string().uuid({ message: 'sessao_exercicio_id deve ser UUID válido' })
                .openapi({ description: "UUID do sessao_exercicio", example: "550e8400-e29b-41d4-a716-446655440005" }),
            ordem: z.number().int().min(1, { message: 'ordem deve ser maior que 0' })
                .openapi({ description: "Nova posição do exercício na sessão", example: 1 }),
        }).strict())
        .min(1, { message: 'exercicios deve conter ao menos um item' })
        .openapi({ description: "Lista de exercícios com nova ordem" }),
}).strict().superRefine((val, ctx) => {
    const ordens = val.exercicios.map((e) => e.ordem);
    const duplicados = ordens.filter((o, i) => ordens.indexOf(o) !== i);
    if (duplicados.length > 0) {
        ctx.addIssue({ code: 'custom', path: ['exercicios'], message: `ordem deve ser única. Duplicados: ${[...new Set(duplicados)].join(', ')}` });
    }
}).openapi('ReordenarExerciciosInput');

type ReordenarExerciciosInput = z.infer<typeof reordenarExerciciosSchema>;

export { sessaoSchema, sessaoIdSchema, sessaoListQuerySchema, sessaoUpdateSchema, sessaoExercicioUpdateSchema, exercicioIdSchema, sessaoSeriesUpdateSchema, reordenarExerciciosSchema };
export type { SessaoListQuery, SessaoSeriesUpdate, ReordenarExerciciosInput };
