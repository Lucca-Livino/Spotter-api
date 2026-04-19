import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

export const exerciseDbRegistry = new OpenAPIRegistry();

const ExerciseDbItem = z.object({
    id: z.string().openapi({ example: "0001" }),
    name: z.string().openapi({ example: "3/4 sit-up" }),
    bodyPart: z.string().openapi({ example: "waist" }),
    target: z.string().openapi({ example: "abs" }),
    equipment: z.string().openapi({ example: "body weight" }),
    secondaryMuscles: z.array(z.string()).optional().openapi({ example: ["hip flexors", "lower back"] }),
    instructions: z.array(z.string()).optional().openapi({ example: ["Lie on your back..."] }),
    gifUrl: z.string().openapi({ example: "https://v2.exercisedb.io/image/..." }),
}).openapi("ExerciseDbItem");

const Paginacao = {
    limit: z.string().optional().openapi({ description: "Limite de resultados (1-50)", example: "10" }),
    offset: z.string().optional().openapi({ description: "Página baseada em 1 (1 = primeira página)", example: "1" }),
};

const wrapSuccess = (dataSchema: z.ZodTypeAny, exampleMsg: string | null = null) => z.object({
    error: z.boolean().openapi({ example: false }),
    code: z.number().openapi({ example: 200 }),
    message: z.string().nullable().openapi({ example: exampleMsg }),
    data: dataSchema,
    errors: z.array(z.any()),
});

// Consultas (proxy — admin-only, consomem quota da API externa)

const respostasConsulta = {
    200: { description: "Resultados encontrados" },
    401: { description: "Não autorizado" },
    403: { description: "Requer perfil admin" },
    429: { description: "Quota da API externa atingida" },
    502: { description: "Erro upstream na ExerciseDB" },
    503: { description: "EXERCISEDB_API_KEY não configurada" },
};

exerciseDbRegistry.registerPath({
    method: "get",
    path: "/exercisedb/search",
    summary: "Buscar exercícios por nome (ExerciseDB) — admin",
    description: "Busca exercícios na ExerciseDB v2 (RapidAPI) filtrando por nome. Rota admin-only — consome 1 chamada de quota por request (~500/mês no plano Basic).",
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    request: {
        query: z.object({
            name: z.string().openapi({ description: "Nome a buscar (parcial)", example: "squat" }),
            ...Paginacao,
        }),
    },
    responses: {
        ...respostasConsulta,
        200: { description: "Resultados encontrados", content: { "application/json": { schema: wrapSuccess(z.array(ExerciseDbItem)) } } },
        400: { description: "Parâmetro name obrigatório" },
    },
});

exerciseDbRegistry.registerPath({
    method: "get",
    path: "/exercisedb/body-parts",
    summary: "Listar partes do corpo (ExerciseDB) — admin",
    description: "Retorna as 10 partes do corpo suportadas pela ExerciseDB v2. Rota admin-only. Consome 1 request da quota.",
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    responses: {
        ...respostasConsulta,
        200: { description: "Lista de partes do corpo", content: { "application/json": { schema: wrapSuccess(z.array(z.string()).openapi({ example: ["back", "cardio", "chest", "waist"] })) } } },
    },
});

exerciseDbRegistry.registerPath({
    method: "get",
    path: "/exercisedb/body-part/{bodyPart}",
    summary: "Listar exercícios por parte do corpo (ExerciseDB) — admin",
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    request: {
        params: z.object({ bodyPart: z.string().openapi({ example: "chest" }) }),
        query: z.object(Paginacao),
    },
    responses: {
        ...respostasConsulta,
        200: { description: "Lista de exercícios", content: { "application/json": { schema: wrapSuccess(z.array(ExerciseDbItem)) } } },
    },
});

exerciseDbRegistry.registerPath({
    method: "get",
    path: "/exercisedb/targets",
    summary: "Listar músculos-alvo (ExerciseDB) — admin",
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    responses: {
        ...respostasConsulta,
        200: { description: "Lista de targets", content: { "application/json": { schema: wrapSuccess(z.array(z.string())) } } },
    },
});

exerciseDbRegistry.registerPath({
    method: "get",
    path: "/exercisedb/target/{target}",
    summary: "Listar exercícios por músculo-alvo (ExerciseDB) — admin",
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    request: {
        params: z.object({ target: z.string().openapi({ example: "biceps" }) }),
        query: z.object(Paginacao),
    },
    responses: {
        ...respostasConsulta,
        200: { description: "Lista de exercícios", content: { "application/json": { schema: wrapSuccess(z.array(ExerciseDbItem)) } } },
    },
});

exerciseDbRegistry.registerPath({
    method: "get",
    path: "/exercisedb/equipments",
    summary: "Listar equipamentos (ExerciseDB) — admin",
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    responses: {
        ...respostasConsulta,
        200: { description: "Lista de equipamentos", content: { "application/json": { schema: wrapSuccess(z.array(z.string())) } } },
    },
});

exerciseDbRegistry.registerPath({
    method: "get",
    path: "/exercisedb/equipment/{equipment}",
    summary: "Listar exercícios por equipamento (ExerciseDB) — admin",
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    request: {
        params: z.object({ equipment: z.string().openapi({ example: "barbell" }) }),
        query: z.object(Paginacao),
    },
    responses: {
        ...respostasConsulta,
        200: { description: "Lista de exercícios", content: { "application/json": { schema: wrapSuccess(z.array(ExerciseDbItem)) } } },
    },
});

// Sincronização

const SyncMusculosResult = z.object({
    criados: z.number(),
    existentes: z.number(),
    grupos_criados: z.array(z.string()),
}).openapi("SyncMusculosResult");

const SyncAparelhosResult = z.object({
    criados: z.number(),
    existentes: z.number(),
}).openapi("SyncAparelhosResult");

const SyncExerciciosResult = z.object({
    sincronizados: z.number(),
    ja_existiam: z.number(),
    erros: z.array(z.object({ nome: z.string(), motivo: z.string() })),
    proximo_offset: z.number().nullable(),
    total_processado: z.number(),
    requests_api_utilizadas: z.number().optional(),
}).openapi("SyncExerciciosResult");

const SyncCompletoResult = z.object({
    musculos: SyncMusculosResult,
    aparelhos: SyncAparelhosResult,
    exercicios: SyncExerciciosResult,
    requests_api_utilizadas: z.number(),
}).openapi("SyncCompletoResult");

exerciseDbRegistry.registerPath({
    method: "post",
    path: "/exercisedb/sync/musculos",
    summary: "Sincronizar músculos a partir da ExerciseDB (admin)",
    description: "Popula a tabela `musculo` com os targets da ExerciseDB v2. Consome ~2 requests (bodyPartList + targetList). Idempotente — rodar várias vezes é seguro.",
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    responses: {
        200: { description: "Sincronização concluída", content: { "application/json": { schema: wrapSuccess(SyncMusculosResult, "Músculos sincronizados com sucesso") } } },
        401: { description: "Não autorizado" },
        403: { description: "Requer perfil admin" },
        502: { description: "Falha upstream" },
        503: { description: "EXERCISEDB_API_KEY não configurada" },
    },
});

exerciseDbRegistry.registerPath({
    method: "post",
    path: "/exercisedb/sync/aparelhos",
    summary: "Sincronizar aparelhos a partir da ExerciseDB (admin)",
    description: "Popula a tabela `aparelho` com os equipamentos da ExerciseDB v2. Consome 1 request. Idempotente.",
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    responses: {
        200: { description: "Sincronização concluída", content: { "application/json": { schema: wrapSuccess(SyncAparelhosResult, "Aparelhos sincronizados com sucesso") } } },
        401: { description: "Não autorizado" },
        403: { description: "Requer perfil admin" },
    },
});

exerciseDbRegistry.registerPath({
    method: "post",
    path: "/exercisedb/sync/exercicios",
    summary: "Sincronizar exercícios (batch, admin)",
    description: `Importa um batch de exercícios da ExerciseDB v2, cria registros na tabela \`exercicio\`, associa músculos/aparelhos e faz cache da animação no S3 (GarageHQ).

**Mídia:** A API v2 não retorna \`gifUrl\` na listagem — para cada exercício é feita uma chamada extra a \`GET /image?exerciseId={id}&resolution=360\` que retorna o GIF em 360p (default). Se o servidor tiver \`ffmpeg\` instalado, o GIF é convertido para WebM (VP9, bem menor). Caso contrário, o GIF é mantido.

**Consumo de quota:** com \`cachear_midia=true\` (opt-in), cada batch consome \`1 + N\` requests (onde N é o tamanho do batch). Por padrão (\`cachear_midia\` omitido), consome apenas 1 request (apenas metadados).

Requer que \`/sync/musculos\` e \`/sync/aparelhos\` tenham sido executados antes.`,
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    request: {
        query: z.object({
            limit: z.string().optional().openapi({ description: "Tamanho do batch (máx. 100)", example: "50" }),
            offset: z.string().optional().openapi({ description: "Página baseada em 1", example: "1" }),
            cachear_midia: z.enum(['true', 'false']).optional().openapi({ description: "Opt-in: se `true`, baixa e armazena o GIF no S3. Default: false (apenas metadados)", example: "false" }),
        }),
    },
    responses: {
        200: { description: "Batch processado", content: { "application/json": { schema: wrapSuccess(SyncExerciciosResult) } } },
        401: { description: "Não autorizado" },
        403: { description: "Requer perfil admin" },
        429: { description: "Quota da API externa atingida" },
        502: { description: "Falha upstream" },
    },
});

exerciseDbRegistry.registerPath({
    method: "post",
    path: "/exercisedb/sync/completo",
    summary: "Sincronização completa (músculos + aparelhos + exercícios) — admin",
    description: `Executa na ordem: sync de músculos, aparelhos e paginação completa dos exercícios (~1300 disponíveis).

**Consumo padrão (sem mídia):** ~3 requests para listas + batches de listagem = ~5 requests para 100 exercícios (default). **Com mídia (\`cachear_midia=true\`):** +1 request por exercício (GIF).

**Controle de gasto:** \`max_exercicios\` (default 100, máx 1500). Recomendado para plano free: \`max_exercicios=50&cachear_midia=true\` (~53 requests) ou \`max_exercicios=200\` sem mídia (~7 requests).`,
    tags: ["ExerciseDB"],
    security: [{ BearerAuth: [] }],
    request: {
        query: z.object({
            max_exercicios: z.string().optional().openapi({ description: "Limite máximo de exercícios a processar. Default: 100. Máx: 1500.", example: "100" }),
            cachear_midia: z.enum(['true', 'false']).optional().openapi({ description: "Opt-in: se `true`, baixa e armazena os GIFs no S3. Default: false.", example: "false" }),
        }),
    },
    responses: {
        200: { description: "Sincronização executada", content: { "application/json": { schema: wrapSuccess(SyncCompletoResult, "Sincronização completa executada.") } } },
        401: { description: "Não autorizado" },
        403: { description: "Requer perfil admin" },
        429: { description: "Quota da API externa atingida durante execução" },
        502: { description: "Falha upstream" },
        503: { description: "EXERCISEDB_API_KEY não configurada" },
    },
});
