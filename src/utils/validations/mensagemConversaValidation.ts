import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const envioMensagemConversaSchema = z.object({
  conteudo: z
    .string()
    .trim()
    .min(1, { message: 'conteudo e obrigatorio' })
    .max(2000, { message: 'conteudo deve ter no maximo 2000 caracteres' }),
}).strict();

export const mensagemConversaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(30),
}).strict().partial();
