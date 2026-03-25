import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { sessaoSchema, sessaoUpdateSchema, sessaoExercicioUpdateSchema } from "../utils/validations/sessaoValidation";

export const sessaoRegistry = new OpenAPIRegistry();

const SessaoSerieResponse = z.object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440010" }),
    numero_serie: z.number().openapi({ example: 1 }),
    repeticoes_realizadas: z.number().nullable().openapi({ example: null }),
    carga_utilizada: z.string().nullable().openapi({ example: null }),
    status: z.enum(['PENDENTE', 'CONCLUIDA', 'PULADA']).openapi({ example: "PENDENTE" }),
    observacoes: z.string().nullable().openapi({ example: null }),
}).openapi("SessaoSerie");

const SessaoExercicioResponse = z.object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440005" }),
    treino_exercicio_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440002" }),
    concluido: z.boolean().openapi({ example: false }),
    observacoes: z.string().nullable().openapi({ example: null }),
    exercicio: z.object({
        id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440003" }),
        nome: z.string().openapi({ example: "Supino Reto" }),
        descricao: z.string().nullable().openapi({ example: "Exercício para peitorais" }),
    }),
    template: z.object({
        series: z.number().openapi({ example: 4 }),
        repeticoes: z.string().openapi({ example: "12" }),
        carga_sugerida: z.string().nullable().openapi({ example: "80.00" }),
        tempo_descanso_segundos: z.number().openapi({ example: 90 }),
        ordem_execucao: z.number().openapi({ example: 1 }),
    }),
    series: z.array(SessaoSerieResponse),
}).openapi("SessaoExercicio");

const SessaoResponse = z.object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    aluno_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440001" }),
    treino_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440004" }),
    status: z.enum(['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']).openapi({ example: "EM_ANDAMENTO" }),
    inicio: z.coerce.date().openapi({ example: "2026-03-23T10:00:00.000Z" }),
    fim: z.coerce.date().nullable().openapi({ example: null }),
    observacoes: z.string().nullable().openapi({ example: null }),
    treino_nome: z.string().openapi({ example: "Treino A - Peito e Tríceps" }),
    exercicios: z.array(SessaoExercicioResponse),
}).openapi("Sessao");

const SessaoListItemResponse = z.object({
    id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    aluno_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440001" }),
    treino_id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440004" }),
    status: z.enum(['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']).openapi({ example: "CONCLUIDA" }),
    inicio: z.coerce.date().openapi({ example: "2026-03-23T10:00:00.000Z" }),
    fim: z.coerce.date().nullable().openapi({ example: "2026-03-23T11:05:00.000Z" }),
    observacoes: z.string().nullable().openapi({ example: null }),
    treino_nome: z.string().openapi({ example: "Treino A - Peito e Tríceps" }),
}).openapi("SessaoListItem");

const SessaoResumoResponse = z.object({
    duracao_minutos: z.number().nullable().openapi({ example: 65 }),
    exercicios_concluidos: z.number().openapi({ example: 4 }),
    exercicios_total: z.number().openapi({ example: 5 }),
    series_concluidas: z.number().openapi({ example: 16 }),
    series_total: z.number().openapi({ example: 20 }),
    volume_total_kg: z.number().openapi({ example: 4800.5 }),
    taxa_conclusao: z.number().openapi({ example: 80 }),
}).openapi("SessaoResumo");

// POST /sessoes
sessaoRegistry.registerPath({
    method: "post",
    path: "/sessoes",
    summary: "Iniciar sessão de treino",
    description: `Inicia uma nova sessão de treino para o aluno autenticado.

Cria automaticamente:
- Uma sessao_treino com status EM_ANDAMENTO
- Uma sessao_exercicio para cada exercício do treino
- N sessao_serie com status PENDENTE por exercício (N = quantidade de séries configuradas no treino)

**Regras:**
- Apenas alunos podem iniciar sessões
- O treino deve pertencer ao aluno autenticado
- Retorna 409 se já houver uma sessão EM_ANDAMENTO para o aluno`,
    tags: ["Sessao"],
    security: [{ BearerAuth: [] }],
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: sessaoSchema },
            },
        },
    },
    responses: {
        201: {
            description: "Sessão iniciada com sucesso",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 201 }),
                        message: z.string().nullable().openapi({ example: "Recurso criado com sucesso" }),
                        data: SessaoResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        403: { description: "Apenas alunos podem iniciar sessões de treino" },
        409: { description: "Já existe uma sessão em andamento para este aluno" },
        422: { description: "Treino não encontrado ou não pertence ao aluno / erro de validação" },
    },
});

// GET /sessoes
sessaoRegistry.registerPath({
    method: "get",
    path: "/sessoes",
    summary: "Listar sessões de treino",
    description: `Listagem paginada de sessões com filtros.

**Controle de acesso:**
- **Aluno**: vê apenas as próprias sessões
- **Treinador**: vê sessões dos alunos com treinos vinculados a ele
- **Admin**: vê todas as sessões`,
    tags: ["Sessao"],
    security: [{ BearerAuth: [] }],
    request: {
        query: z.object({
            aluno_id: z.string().uuid().optional().openapi({ example: "550e8400-e29b-41d4-a716-446655440001", description: "Filtra por aluno (admin/treinador)" }),
            treino_id: z.string().uuid().optional().openapi({ example: "550e8400-e29b-41d4-a716-446655440004", description: "Filtra por treino" }),
            status: z.enum(['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']).optional().openapi({ example: "CONCLUIDA", description: "Filtra por status" }),
            data_inicio: z.string().optional().openapi({ example: "2026-03-01T00:00:00.000Z", description: "Filtra sessões iniciadas a partir desta data" }),
            data_fim: z.string().optional().openapi({ example: "2026-03-31T23:59:59.999Z", description: "Filtra sessões iniciadas até esta data" }),
            page: z.string().optional().openapi({ example: "1", description: "Número da página" }),
            limite: z.string().optional().openapi({ example: "10", description: "Itens por página (máx. 100)" }),
            ordem_data_inicio: z.enum(['asc', 'desc']).optional().openapi({ example: "desc", description: "Ordena por data de início" }),
        }),
    },
    responses: {
        200: {
            description: "Lista de sessões",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable().openapi({ example: null }),
                        data: z.object({
                            dados: z.array(SessaoListItemResponse),
                            total: z.number().openapi({ example: 42 }),
                            page: z.number().openapi({ example: 1 }),
                            limite: z.number().openapi({ example: 10 }),
                            totalPages: z.number().openapi({ example: 5 }),
                        }),
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        403: { description: "Sem permissão para listar estas sessões" },
        422: { description: "Erro de validação nos filtros" },
    },
});

// GET /sessoes/em-andamento
sessaoRegistry.registerPath({
    method: "get",
    path: "/sessoes/em-andamento",
    summary: "Sessão em andamento do usuário autenticado",
    description: `Retorna a sessão EM_ANDAMENTO do aluno autenticado, ou null se não houver nenhuma.

Usada pelo app mobile para retomar treino interrompido.

**Regras:**
- Apenas alunos podem consultar este endpoint
- Treinadores recebem 403`,
    tags: ["Sessao"],
    security: [{ BearerAuth: [] }],
    responses: {
        200: {
            description: "Sessão em andamento (ou null se não houver)",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable().openapi({ example: null }),
                        data: SessaoResponse.nullable().openapi({ example: null }),
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        403: { description: "Apenas alunos podem consultar sessão em andamento" },
    },
});

// GET /sessoes/:id
sessaoRegistry.registerPath({
    method: "get",
    path: "/sessoes/{id}",
    summary: "Detalhe de uma sessão",
    description: `Retorna os dados completos de uma sessão: exercícios, séries e template do treino.

**Controle de acesso:**
- **Aluno**: apenas as próprias sessões
- **Treinador**: apenas sessões de alunos com treinos vinculados
- **Admin**: qualquer sessão`,
    tags: ["Sessao"],
    security: [{ BearerAuth: [] }],
    request: {
        params: z.object({
            id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
        }),
    },
    responses: {
        200: {
            description: "Sessão encontrada",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable().openapi({ example: null }),
                        data: SessaoResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        403: { description: "Sem permissão para visualizar esta sessão" },
        404: { description: "Sessão não encontrada" },
        422: { description: "ID inválido" },
    },
});

// GET /sessoes/:id/resumo
sessaoRegistry.registerPath({
    method: "get",
    path: "/sessoes/{id}/resumo",
    summary: "Resumo calculado de uma sessão",
    description: `Retorna campos calculados da sessão: duração, exercícios e séries concluídas, volume total e taxa de conclusão.

- duracao_minutos: null se a sessão ainda está EM_ANDAMENTO e sem fim registrado
- volume_total_kg: soma de carga_utilizada × repeticoes_realizadas das séries CONCLUIDA
- taxa_conclusao: percentual de séries concluídas (0 a 100)`,
    tags: ["Sessao"],
    security: [{ BearerAuth: [] }],
    request: {
        params: z.object({
            id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
        }),
    },
    responses: {
        200: {
            description: "Resumo da sessão",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable().openapi({ example: null }),
                        data: SessaoResumoResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        403: { description: "Sem permissão para visualizar esta sessão" },
        404: { description: "Sessão não encontrada" },
        422: { description: "ID inválido" },
    },
});

// PATCH /sessoes/:id
sessaoRegistry.registerPath({
    method: "patch",
    path: "/sessoes/{id}",
    summary: "Atualizar observações de uma sessão",
    description: `Atualiza as observações gerais da sessão de treino.

**Regras:**
- Apenas sessões com status EM_ANDAMENTO podem ser atualizadas
- Retorna 409 se a sessão já estiver finalizada ou cancelada`,
    tags: ["Sessao"],
    security: [{ BearerAuth: [] }],
    request: {
        params: z.object({
            id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
        }),
        body: {
            required: true,
            content: {
                "application/json": { schema: sessaoUpdateSchema },
            },
        },
    },
    responses: {
        200: {
            description: "Sessão atualizada com sucesso",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable().openapi({ example: null }),
                        data: SessaoResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        403: { description: "Sem permissão para atualizar esta sessão" },
        404: { description: "Sessão não encontrada" },
        409: { description: "Sessão não está em andamento" },
        422: { description: "Erro de validação" },
    },
});

// PATCH /sessoes/:id/exercicios/:exercicioId
sessaoRegistry.registerPath({
    method: "patch",
    path: "/sessoes/{id}/exercicios/{exercicioId}",
    summary: "Atualizar exercício de uma sessão",
    description: `Marca um exercício da sessão como concluído ou não concluído e atualiza observações.

**Regras:**
- Apenas sessões com status EM_ANDAMENTO podem ser atualizadas
- O exercício deve pertencer à sessão informada
- Retorna 409 se a sessão já estiver finalizada ou cancelada`,
    tags: ["Sessao"],
    security: [{ BearerAuth: [] }],
    request: {
        params: z.object({
            id: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
            exercicioId: z.string().uuid().openapi({ example: "550e8400-e29b-41d4-a716-446655440005" }),
        }),
        body: {
            required: true,
            content: {
                "application/json": { schema: sessaoExercicioUpdateSchema },
            },
        },
    },
    responses: {
        200: {
            description: "Exercício da sessão atualizado com sucesso",
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.boolean().openapi({ example: false }),
                        code: z.number().openapi({ example: 200 }),
                        message: z.string().nullable().openapi({ example: null }),
                        data: SessaoResponse,
                        errors: z.array(z.any()),
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
        403: { description: "Sem permissão para atualizar esta sessão" },
        404: { description: "Sessão ou exercício não encontrado" },
        409: { description: "Sessão não está em andamento" },
        422: { description: "Erro de validação" },
    },
});
