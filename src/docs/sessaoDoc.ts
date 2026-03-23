import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { sessaoSchema } from "../utils/validations/sessaoValidation";

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

// POST /sessoes
sessaoRegistry.registerPath({
    method: "post",
    path: "/sessoes",
    summary: "Iniciar sessão de treino",
    description: `Inicia uma nova sessão de treino para o aluno autenticado.

Cria automaticamente:
- Uma \`sessao_treino\` com status \`EM_ANDAMENTO\`
- Uma \`sessao_exercicio\` para cada exercício do treino
- N \`sessao_serie\` com status \`PENDENTE\` por exercício (N = quantidade de séries configuradas no treino)

**Regras:**
- Apenas alunos podem iniciar sessões
- O treino deve pertencer ao aluno autenticado
- Retorna 409 se já houver uma sessão \`EM_ANDAMENTO\` para o aluno`,
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
