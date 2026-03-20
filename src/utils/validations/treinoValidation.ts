import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const treinoSchema = z.object({
    nome: z
        .string()
        .min(1, { message: 'O nome do treino é obrigatório' })
        .max(255, { message: 'O nome do treino deve ter no máximo 255 caracteres' })
        .openapi({ description: 'Nome do treino', example: 'Treino A - Peito e Tríceps' }),
    descricao: z
        .string()
        .max(1000, { message: 'A descrição deve ter no máximo 1000 caracteres' })
        .nullable()
        .optional()
        .openapi({ description: 'Descrição do treino', example: 'Treino focado em membros superiores' }),
    aluno_id: z
        .string()
        .uuid({ message: 'O ID do aluno deve ser um UUID válido' })
        .optional()
        .openapi({ description: 'UUID do aluno dono do treino', example: '550e8400-e29b-41d4-a716-446655440000' }),
    exercicios: z
        .array(
            z.object({
                exercicio_id: z
                    .string()
                    .uuid({ message: 'exercicio_id deve ser um UUID válido' })
                    .openapi({ description: 'UUID do exercício', example: '550e8400-e29b-41d4-a716-446655440030' }),
                series: z
                    .number()
                    .int({ message: 'series deve ser inteiro' })
                    .min(1, { message: 'series deve ser maior que 0' })
                    .max(20, { message: 'series deve ser no máximo 20' })
                    .openapi({ description: 'Quantidade de séries', example: 4 }),
                repeticoes: z
                    .string()
                    .trim()
                    .min(1, { message: 'repeticoes é obrigatório' })
                    .max(50, { message: 'repeticoes deve ter no máximo 50 caracteres' })
                    .openapi({ description: 'Faixa de repetições', example: '8-12' }),
                carga_sugerida: z
                    .union([
                        z.number().positive({ message: 'carga_sugerida deve ser positiva' }),
                        z.string().regex(/^\d+(\.\d{1,2})?$/, { message: 'carga_sugerida deve ser número válido com até 2 casas decimais' }),
                    ])
                    .nullable()
                    .optional()
                    .openapi({ description: 'Carga sugerida (opcional)', example: 30 }),
                tempo_descanso_segundos: z
                    .number()
                    .int({ message: 'tempo_descanso_segundos deve ser inteiro' })
                    .min(0, { message: 'tempo_descanso_segundos não pode ser negativo' })
                    .max(3600, { message: 'tempo_descanso_segundos deve ser no máximo 3600' })
                    .openapi({ description: 'Tempo de descanso em segundos', example: 90 }),
                ordem_execucao: z
                    .number()
                    .int({ message: 'ordem_execucao deve ser inteiro' })
                    .min(1, { message: 'ordem_execucao deve ser maior que 0' })
                    .openapi({ description: 'Ordem de execução no treino', example: 1 }),
            }).strict(),
        )
        .optional()
        .openapi({ description: 'Composição inicial do treino' }),
}).strict().superRefine((dados, ctx) => {
    if (dados.exercicios && dados.exercicios.length > 0) {
        const ordens = dados.exercicios.map((item) => item.ordem_execucao);
        const ordensDuplicadas = ordens.filter((ordem, idx) => ordens.indexOf(ordem) !== idx);
        if (ordensDuplicadas.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['exercicios'],
                message: 'Não é permitido repetir ordem_execucao na composição do treino',
            });
        }

        const exercicioIds = dados.exercicios.map((item) => item.exercicio_id);
        const exerciciosDuplicados = exercicioIds.filter((id, idx) => exercicioIds.indexOf(id) !== idx);
        if (exerciciosDuplicados.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['exercicios'],
                message: 'Não é permitido repetir exercicio_id na composição inicial do treino',
            });
        }
    }
}).openapi('TreinoInput');

const treinoUpdateSchema = z.object({
    nome: z
        .string()
        .min(1, { message: 'O nome do treino é obrigatório' })
        .max(255, { message: 'O nome do treino deve ter no máximo 255 caracteres' })
        .optional()
        .openapi({ description: 'Nome do treino', example: 'Treino A - Atualizado' }),
    descricao: z
        .string()
        .max(1000, { message: 'A descrição deve ter no máximo 1000 caracteres' })
        .nullable()
        .optional()
        .openapi({ description: 'Descrição do treino', example: 'Ajuste de foco para hipertrofia' }),
    adicionar_exercicios: z
        .array(
            z.object({
                exercicio_id: z
                    .string()
                    .uuid({ message: 'exercicio_id deve ser um UUID válido' })
                    .openapi({ description: 'UUID do exercício a ser adicionado', example: '550e8400-e29b-41d4-a716-446655440030' }),
                series: z
                    .number()
                    .int({ message: 'series deve ser inteiro' })
                    .min(1, { message: 'series deve ser maior que 0' })
                    .max(20, { message: 'series deve ser no máximo 20' })
                    .openapi({ description: 'Quantidade de séries', example: 4 }),
                repeticoes: z
                    .string()
                    .trim()
                    .min(1, { message: 'repeticoes é obrigatório' })
                    .max(50, { message: 'repeticoes deve ter no máximo 50 caracteres' })
                    .openapi({ description: 'Faixa de repetições', example: '8-12' }),
                carga_sugerida: z
                    .union([
                        z.number().positive({ message: 'carga_sugerida deve ser positiva' }),
                        z.string().regex(/^\d+(\.\d{1,2})?$/, { message: 'carga_sugerida deve ser número válido com até 2 casas decimais' }),
                    ])
                    .nullable()
                    .optional()
                    .openapi({ description: 'Carga sugerida (opcional)', example: 30 }),
                tempo_descanso_segundos: z
                    .number()
                    .int({ message: 'tempo_descanso_segundos deve ser inteiro' })
                    .min(0, { message: 'tempo_descanso_segundos não pode ser negativo' })
                    .max(3600, { message: 'tempo_descanso_segundos deve ser no máximo 3600' })
                    .openapi({ description: 'Tempo de descanso em segundos', example: 90 }),
                ordem_execucao: z
                    .number()
                    .int({ message: 'ordem_execucao deve ser inteiro' })
                    .min(1, { message: 'ordem_execucao deve ser maior que 0' })
                    .openapi({ description: 'Ordem de execução no treino', example: 3 }),
            }).strict(),
        )
        .min(1, { message: 'adicionar_exercicios deve conter ao menos 1 item' })
        .optional()
        .openapi({ description: 'Lista de novos itens para adicionar ao treino' }),
    remover_exercicios_ids: z
        .array(
            z.string().uuid({ message: 'Cada item de remover_exercicios_ids deve ser um UUID válido' }),
        )
        .min(1, { message: 'remover_exercicios_ids deve conter ao menos 1 item' })
        .optional()
        .openapi({ description: 'Lista de IDs para remoção. Aceita tanto treino_exercicio.id quanto exercicio.id já vinculado ao treino.' }),
}).strict().superRefine((dados, ctx) => {
    if (dados.adicionar_exercicios) {
        const ordens = dados.adicionar_exercicios.map((item) => item.ordem_execucao);
        const ordensDuplicadas = ordens.filter((ordem, idx) => ordens.indexOf(ordem) !== idx);
        if (ordensDuplicadas.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['adicionar_exercicios'],
                message: 'Não é permitido repetir ordem_execucao em adicionar_exercicios',
            });
        }

        const exercicioIds = dados.adicionar_exercicios.map((item) => item.exercicio_id);
        const exerciciosDuplicados = exercicioIds.filter((id, idx) => exercicioIds.indexOf(id) !== idx);
        if (exerciciosDuplicados.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['adicionar_exercicios'],
                message: 'Não é permitido repetir exercicio_id em adicionar_exercicios',
            });
        }
    }

    if (dados.remover_exercicios_ids) {
        const ids = dados.remover_exercicios_ids;
        const idsDuplicados = ids.filter((id, idx) => ids.indexOf(id) !== idx);
        if (idsDuplicados.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['remover_exercicios_ids'],
                message: 'Não é permitido repetir IDs em remover_exercicios_ids',
            });
        }
    }
}).refine(
    (dados) =>
        dados.nome !== undefined ||
        dados.descricao !== undefined ||
        (dados.adicionar_exercicios?.length ?? 0) > 0 ||
        (dados.remover_exercicios_ids?.length ?? 0) > 0,
    { message: 'Informe ao menos uma alteração: nome, descricao, adicionar_exercicios ou remover_exercicios_ids' },
).openapi('TreinoUpdateInput');

const treinoIdSchema = z
    .string()
    .uuid('ID inválido, deve ser um UUID válido')
    .openapi({ description: 'UUID do treino', example: '550e8400-e29b-41d4-a716-446655440010' });

const treinoDetalheQuerySchema = z.object({
    nome_exercicio: z
        .string()
        .trim()
        .min(1)
        .max(255)
        .optional()
        .openapi({
            description: 'Filtra exercícios do treino por nome (contém, case-insensitive)',
            example: 'supino',
        }),
    grupo_muscular: z
        .enum(['PEITO', 'COSTAS', 'PERNAS', 'BRAÇOS', 'OMBROS', 'ABDOMEN'])
        .optional()
        .openapi({
            description: 'Filtra exercícios do treino por grupo muscular',
            example: 'PEITO',
        }),
    tipo_ativacao: z
        .enum(['PRIMARIO', 'SECUNDARIO'])
        .optional()
        .openapi({
            description: 'Filtra exercícios do treino por tipo de ativação muscular',
            example: 'PRIMARIO',
        }),
    ordem_execucao: z
        .enum(['asc', 'desc'])
        .default('asc')
        .openapi({
            description: 'Define ordenação da lista de exercícios por ordem_execucao',
            example: 'asc',
        }),
    apenas_ativos: z
        .coerce
        .boolean()
        .default(true)
        .openapi({
            description: 'Quando true, retorna apenas exercícios ativos (deletado_em nulo)',
            example: true,
        }),
    incluir_musculos: z
        .coerce
        .boolean()
        .default(false)
        .openapi({
            description: 'Quando true, popula músculos vinculados de cada exercício',
            example: true,
        }),
    incluir_aparelhos: z
        .coerce
        .boolean()
        .default(false)
        .openapi({
            description: 'Quando true, popula aparelhos vinculados de cada exercício',
            example: false,
        }),
}).strict().openapi('TreinoDetalheQuery');

type TreinoDetalheQuery = z.infer<typeof treinoDetalheQuerySchema>;

const treinoListQuerySchema = z.object({
    nome: z
        .string()
        .trim()
        .min(1)
        .max(255)
        .optional()
        .openapi({
            description: 'Filtra treinos por nome (contém, case-insensitive)',
            example: 'Treino A',
        }),
    usuario_id: z
        .string()
        .uuid({ message: 'usuario_id deve ser um UUID válido' })
        .optional()
        .openapi({
            description: 'Filtra treinos por aluno dono',
            example: '550e8400-e29b-41d4-a716-446655440000',
        }),
    treinador_id: z
        .string()
        .uuid({ message: 'treinador_id deve ser um UUID válido' })
        .optional()
        .openapi({
            description: 'Filtra treinos por treinador responsável',
            example: '550e8400-e29b-41d4-a716-446655440002',
        }),
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => Number.isInteger(val) && val > 0, {
            message: 'page deve ser um número inteiro maior que 0',
        })
        .openapi({ description: 'Número da página', example: '1' }),
    limite: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, {
            message: 'limite deve ser entre 1 e 100',
        })
        .openapi({ description: 'Limite de itens por página', example: '10' }),
    ordem_data_criacao: z
        .enum(['asc', 'desc'])
        .default('desc')
        .openapi({
            description: 'Ordena por data_criacao do treino',
            example: 'desc',
        }),
    incluir_exercicios: z
        .coerce
        .boolean()
        .default(false)
        .openapi({
            description: 'Quando true, inclui os exercícios de cada treino na listagem',
            example: false,
        }),
    somente_com_exercicios: z
        .coerce
        .boolean()
        .default(false)
        .openapi({
            description: 'Quando true, retorna apenas treinos que possuem exercícios vinculados',
            example: true,
        }),
    nome_exercicio: treinoDetalheQuerySchema.shape.nome_exercicio,
    grupo_muscular: treinoDetalheQuerySchema.shape.grupo_muscular,
    tipo_ativacao: treinoDetalheQuerySchema.shape.tipo_ativacao,
    ordem_execucao: treinoDetalheQuerySchema.shape.ordem_execucao,
    apenas_ativos: treinoDetalheQuerySchema.shape.apenas_ativos,
    incluir_musculos: treinoDetalheQuerySchema.shape.incluir_musculos,
    incluir_aparelhos: treinoDetalheQuerySchema.shape.incluir_aparelhos,
}).strict().openapi('TreinoListQuery');

type TreinoListQuery = z.infer<typeof treinoListQuerySchema>;

const treinoDeleteQuerySchema = z.object({
    force: z
        .enum(['true', 'false'])
        .default('false')
        .transform((val) => val === 'true')
        .openapi({
            description: 'Quando true (somente admin), realiza hard delete em cascata removendo treino e todos os exercícios vinculados permanentemente',
            example: false,
        }),
}).strict().openapi('TreinoDeleteQuery');

type TreinoDeleteQuery = z.infer<typeof treinoDeleteQuerySchema>;

export { treinoSchema, treinoUpdateSchema, treinoIdSchema, treinoDetalheQuerySchema, treinoListQuerySchema, treinoDeleteQuerySchema };
export type { TreinoDetalheQuery, TreinoListQuery, TreinoDeleteQuery };
