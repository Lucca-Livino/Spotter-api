import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const conversaIdSchema = z
  .string()
  .uuid({ message: 'O ID da conversa deve ser um UUID valido' });

export const conversaCriacaoSchema = z.object({
  aluno_id: z
    .string()
    .uuid({ message: 'aluno_id deve ser um UUID valido' })
    .optional(),
}).strict();

export const conversaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
}).strict().partial();
