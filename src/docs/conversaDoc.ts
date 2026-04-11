import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  conversaCriacaoSchema,
  conversaIdSchema,
  conversaQuerySchema,
} from '../utils/validations/conversaValidation';
import {
  envioMensagemConversaSchema,
  mensagemConversaQuerySchema,
} from '../utils/validations/mensagemConversaValidation';

export const conversaRegistry = new OpenAPIRegistry();

const ConversaIdParam = z.object({
  id: conversaIdSchema.openapi({
    description: 'UUID da conversa',
    example: '550e8400-e29b-41d4-a716-446655440301',
  }),
});

const ConversaIdMensagemParam = z.object({
  conversaId: conversaIdSchema.openapi({
    description: 'UUID da conversa',
    example: '550e8400-e29b-41d4-a716-446655440301',
  }),
});

const ConversaResponse = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440301' }),
  treinador_id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440002' }),
  aluno_id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  ativa: z.boolean().openapi({ example: true }),
  ultima_mensagem_em: z.string().datetime().nullable().openapi({ example: '2026-04-07T21:15:22.000Z' }),
  created_at: z.string().datetime().openapi({ example: '2026-04-07T20:00:00.000Z' }),
}).openapi('Conversa');

const ConversaListResponse = z.object({
  dados: z.array(ConversaResponse),
  total: z.number().openapi({ example: 1 }),
  page: z.number().openapi({ example: 1 }),
  limite: z.number().openapi({ example: 20 }),
  totalPages: z.number().openapi({ example: 1 }),
});

const MensagemConversaResponse = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440401' }),
  conversa_id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440301' }),
  remetente_tipo: z.enum(['ALUNO', 'TREINADOR']).openapi({ example: 'TREINADOR' }),
  remetente_user_id: z.string().openapi({ example: 'user_abc123' }),
  conteudo: z.string().openapi({ example: 'Bom treino hoje! Qualquer duvida me chama.' }),
  enviada_em: z.string().datetime().openapi({ example: '2026-04-07T21:15:22.000Z' }),
  lida_em: z.string().datetime().nullable().openapi({ example: null }),
  lida_por_user_id: z.string().nullable().openapi({ example: null }),
  ativa: z.boolean().openapi({ example: true }),
}).openapi('MensagemConversa');

const MensagemListResponse = z.object({
  dados: z.array(MensagemConversaResponse),
  total: z.number().openapi({ example: 2 }),
  page: z.number().openapi({ example: 1 }),
  limite: z.number().openapi({ example: 30 }),
  totalPages: z.number().openapi({ example: 1 }),
});

const BaseSuccess = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    error: z.boolean().openapi({ example: false }),
    code: z.number().openapi({ example: 200 }),
    message: z.string().nullable(),
    data: dataSchema,
    errors: z.array(z.any()),
  });

conversaRegistry.registerPath({
  method: 'get',
  path: '/conversas',
  summary: 'Listar conversas do usuario autenticado',
  description:
    'Retorna as conversas do usuario autenticado com paginacao. Treinador ve conversas com seus alunos; aluno ve somente sua conversa com o treinador vinculado.',
  tags: ['Conversa'],
  security: [{ BearerAuth: [] }],
  request: {
    query: conversaQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista paginada de conversas',
      content: {
        'application/json': {
          schema: BaseSuccess(ConversaListResponse),
        },
      },
    },
    401: { description: 'Nao autorizado' },
    403: { description: 'Perfil sem permissao para acessar conversas' },
  },
});

conversaRegistry.registerPath({
  method: 'post',
  path: '/conversas',
  summary: 'Iniciar ou buscar conversa',
  description:
    'Treinador informa aluno_id para iniciar conversa com um aluno vinculado. Aluno inicia conversa sem body e o sistema usa seu treinador vinculado.',
  tags: ['Conversa'],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      required: false,
      content: {
        'application/json': {
          schema: conversaCriacaoSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Conversa criada ou retornada',
      content: {
        'application/json': {
          schema: BaseSuccess(ConversaResponse),
        },
      },
    },
    401: { description: 'Nao autorizado' },
    403: { description: 'Sem permissao para conversar com este aluno' },
    404: { description: 'Aluno ou treinador nao encontrado' },
    422: { description: 'Erro de validacao' },
  },
});

conversaRegistry.registerPath({
  method: 'get',
  path: '/conversas/{id}',
  summary: 'Buscar conversa por ID',
  description: 'Retorna os dados da conversa se o usuario autenticado for participante.',
  tags: ['Conversa'],
  security: [{ BearerAuth: [] }],
  request: {
    params: ConversaIdParam,
  },
  responses: {
    200: {
      description: 'Conversa encontrada',
      content: {
        'application/json': {
          schema: BaseSuccess(ConversaResponse),
        },
      },
    },
    401: { description: 'Nao autorizado' },
    403: { description: 'Usuario nao participa da conversa' },
    404: { description: 'Conversa nao encontrada' },
    422: { description: 'ID invalido' },
  },
});

conversaRegistry.registerPath({
  method: 'get',
  path: '/conversas/{conversaId}/mensagens',
  summary: 'Listar mensagens da conversa',
  description: 'Retorna as mensagens da conversa com paginacao, em ordem cronologica.',
  tags: ['Conversa'],
  security: [{ BearerAuth: [] }],
  request: {
    params: ConversaIdMensagemParam,
    query: mensagemConversaQuerySchema,
  },
  responses: {
    200: {
      description: 'Lista paginada de mensagens',
      content: {
        'application/json': {
          schema: BaseSuccess(MensagemListResponse),
        },
      },
    },
    401: { description: 'Nao autorizado' },
    403: { description: 'Usuario nao participa da conversa' },
    404: { description: 'Conversa nao encontrada' },
    422: { description: 'Parametros invalidos' },
  },
});

conversaRegistry.registerPath({
  method: 'post',
  path: '/conversas/{conversaId}/mensagens',
  summary: 'Enviar mensagem na conversa',
  description: 'Envia uma mensagem para a conversa e dispara evento realtime no Socket.IO.',
  tags: ['Conversa'],
  security: [{ BearerAuth: [] }],
  request: {
    params: ConversaIdMensagemParam,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: envioMensagemConversaSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Mensagem enviada com sucesso',
      content: {
        'application/json': {
          schema: BaseSuccess(MensagemConversaResponse),
        },
      },
    },
    401: { description: 'Nao autorizado' },
    403: { description: 'Usuario nao participa da conversa' },
    404: { description: 'Conversa nao encontrada' },
    422: { description: 'Erro de validacao' },
  },
});

conversaRegistry.registerPath({
  method: 'patch',
  path: '/conversas/{conversaId}/mensagens/lidas',
  summary: 'Marcar mensagens como lidas',
  description: 'Marca como lidas as mensagens recebidas na conversa pelo usuario autenticado.',
  tags: ['Conversa'],
  security: [{ BearerAuth: [] }],
  request: {
    params: ConversaIdMensagemParam,
  },
  responses: {
    200: {
      description: 'Mensagens marcadas como lidas',
      content: {
        'application/json': {
          schema: BaseSuccess(
            z.object({
              marcadas: z.number().openapi({ example: 3 }),
            }),
          ),
        },
      },
    },
    401: { description: 'Nao autorizado' },
    403: { description: 'Usuario nao participa da conversa' },
    404: { description: 'Conversa nao encontrada' },
    422: { description: 'ID invalido' },
  },
});
