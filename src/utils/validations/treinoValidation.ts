import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const exercicioItemSchema = z.object({
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
        .number()
        .positive({ message: 'carga_sugerida deve ser positiva' })
        .nullable()
        .optional()
        .openapi({ description: 'Carga sugerida em kg (opcional)', example: 30 }),
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
}).strict();

const diasSemanaEnum = z.enum(['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO']);

const boolParam = (defaultVal: boolean) =>
    z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                if (val === 'false' || val === '0') return false;
                if (val === 'true' || val === '1') return true;
            }
            return val;
        },
        z.boolean().default(defaultVal),
    );

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
    dias_semana: z
        .array(diasSemanaEnum)
        .nullable()
        .optional()
        .openapi({ description: 'Dias da semana em que o treino é executado', example: ['SEGUNDA', 'QUINTA'] }),
    ordem: z
        .number()
        .int({ message: 'ordem deve ser inteiro' })
        .min(1, { message: 'ordem deve ser maior que 0' })
        .nullable()
        .optional()
        .openapi({ description: 'Posição do treino na rotina do aluno', example: 1 }),
    exercicios: z
        .array(exercicioItemSchema)
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
    treinador_id: z
        .string()
        .uuid({ message: 'treinador_id deve ser um UUID válido' })
        .nullable()
        .optional()
        .openapi({
            description: 'UUID do novo treinador responsável. Envie null para desvincular o treinador atual.',
            example: '550e8400-e29b-41d4-a716-446655440002',
        }),
    dias_semana: z
        .array(diasSemanaEnum)
        .nullable()
        .optional()
        .openapi({ description: 'Dias da semana em que o treino é executado. Envie null para limpar.', example: ['SEGUNDA', 'QUINTA'] }),
    ordem: z
        .number()
        .int({ message: 'ordem deve ser inteiro' })
        .min(1, { message: 'ordem deve ser maior que 0' })
        .nullable()
        .optional()
        .openapi({ description: 'Posição do treino na rotina do aluno. Envie null para limpar.', example: 1 }),
    adicionar_exercicios: z
        .array(exercicioItemSchema)
        .min(1, { message: 'adicionar_exercicios deve conter ao menos 1 item' })
        .optional()
        .openapi({ description: 'Lista de novos itens para adicionar ao treino' }),
    atualizar_exercicios: z
        .array(
            z.object({
                id: z
                    .string()
                    .uuid({ message: 'id deve ser um UUID válido (treino_exercicio.id)' })
                    .openapi({ description: 'ID do vínculo treino-exercício a atualizar', example: '550e8400-e29b-41d4-a716-446655440020' }),
                series: z
                    .number()
                    .int({ message: 'series deve ser inteiro' })
                    .min(1, { message: 'series deve ser maior que 0' })
                    .max(20, { message: 'series deve ser no máximo 20' })
                    .optional()
                    .openapi({ description: 'Nova quantidade de séries', example: 5 }),
                repeticoes: z
                    .string()
                    .trim()
                    .min(1, { message: 'repeticoes é obrigatório' })
                    .max(50, { message: 'repeticoes deve ter no máximo 50 caracteres' })
                    .optional()
                    .openapi({ description: 'Nova faixa de repetições', example: '10-15' }),
                carga_sugerida: z
                    .number()
                    .positive({ message: 'carga_sugerida deve ser positiva' })
                    .nullable()
                    .optional()
                    .openapi({ description: 'Nova carga sugerida em kg. Envie null para remover.', example: 35 }),
                tempo_descanso_segundos: z
                    .number()
                    .int({ message: 'tempo_descanso_segundos deve ser inteiro' })
                    .min(0, { message: 'tempo_descanso_segundos não pode ser negativo' })
                    .max(3600, { message: 'tempo_descanso_segundos deve ser no máximo 3600' })
                    .optional()
                    .openapi({ description: 'Novo tempo de descanso em segundos', example: 60 }),
                ordem_execucao: z
                    .number()
                    .int({ message: 'ordem_execucao deve ser inteiro' })
                    .min(1, { message: 'ordem_execucao deve ser maior que 0' })
                    .optional()
                    .openapi({ description: 'Nova ordem de execução', example: 2 }),
            }).strict().refine(
                (data) => ['series', 'repeticoes', 'carga_sugerida', 'tempo_descanso_segundos', 'ordem_execucao']
                    .some((k) => k in data && data[k as keyof typeof data] !== undefined),
                { message: 'Informe ao menos um campo para atualizar além do id' },
            ),
        )
        .min(1, { message: 'atualizar_exercicios deve conter ao menos 1 item' })
        .optional()
        .openapi({ description: 'Lista de vínculos existentes para atualizar (séries, carga, repetições etc.)' }),
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

    if (dados.atualizar_exercicios) {
        const ids = dados.atualizar_exercicios.map((item) => item.id);
        const idsDuplicados = ids.filter((id, idx) => ids.indexOf(id) !== idx);
        if (idsDuplicados.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['atualizar_exercicios'],
                message: 'Não é permitido repetir id em atualizar_exercicios',
            });
        }

        const novasOrdens = dados.atualizar_exercicios
            .filter((item) => item.ordem_execucao !== undefined)
            .map((item) => item.ordem_execucao!);
        const ordensDuplicadas = novasOrdens.filter((o, idx) => novasOrdens.indexOf(o) !== idx);
        if (ordensDuplicadas.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['atualizar_exercicios'],
                message: 'Não é permitido repetir ordem_execucao em atualizar_exercicios',
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
        dados.treinador_id !== undefined ||
        dados.dias_semana !== undefined ||
        dados.ordem !== undefined ||
        (dados.adicionar_exercicios?.length ?? 0) > 0 ||
        (dados.atualizar_exercicios?.length ?? 0) > 0 ||
        (dados.remover_exercicios_ids?.length ?? 0) > 0,
    { message: 'Informe ao menos uma alteração: nome, descricao, treinador_id, dias_semana, ordem, adicionar_exercicios, atualizar_exercicios ou remover_exercicios_ids' },
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
    apenas_ativos: boolParam(true)
        .openapi({
            description: 'Quando true, retorna apenas exercícios ativos (deletado_em nulo)',
            example: true,
        }),
    incluir_musculos: boolParam(false)
        .openapi({
            description: 'Quando true, popula músculos vinculados de cada exercício',
            example: true,
        }),
    incluir_aparelhos: boolParam(false)
        .openapi({
            description: 'Quando true, popula aparelhos vinculados de cada exercício',
            example: false,
        }),
    incluir_treino_inativo: boolParam(false)
        .openapi({
            description: 'Quando true, permite buscar um treino mesmo que esteja arquivado (deletado_em preenchido)',
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
    incluir_exercicios: boolParam(false)
        .openapi({
            description: 'Quando true, inclui os exercícios de cada treino na listagem',
            example: false,
        }),
    somente_com_exercicios: boolParam(false)
        .openapi({
            description: 'Quando true, retorna apenas treinos que possuem exercícios vinculados',
            example: true,
        }),
    incluir_inativos: boolParam(false)
        .openapi({
            description: 'Quando true, inclui treinos arquivados (soft-deleted) na listagem. Disponível para todos os perfis dentro do escopo de acesso.',
            example: false,
        }),
    nome_exercicio: treinoDetalheQuerySchema.shape.nome_exercicio,
    grupo_muscular: treinoDetalheQuerySchema.shape.grupo_muscular,
    tipo_ativacao: treinoDetalheQuerySchema.shape.tipo_ativacao,
    ordem_execucao: treinoDetalheQuerySchema.shape.ordem_execucao,
    apenas_ativos: treinoDetalheQuerySchema.shape.apenas_ativos,
    incluir_musculos: treinoDetalheQuerySchema.shape.incluir_musculos,
    incluir_aparelhos: treinoDetalheQuerySchema.shape.incluir_aparelhos,
    dias_semana: z.preprocess(
        (val) => (typeof val === 'string' && val.trim() ? val.split(',').map((v) => v.trim()) : undefined),
        z.array(diasSemanaEnum).optional(),
    ).openapi({
        description: 'Filtra treinos que contenham ao menos um dos dias informados (overlap). Comma-separated.',
        example: 'SEGUNDA,QUARTA',
    }),
    ordem_treino: z
        .enum(['asc', 'desc'])
        .optional()
        .openapi({
            description: 'Ordena treinos por ordem ASC/DESC (NULLs por último). Quando informado, substitui a ordenação por data_criacao.',
            example: 'asc',
        }),
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
