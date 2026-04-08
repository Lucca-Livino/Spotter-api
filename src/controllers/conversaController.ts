import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import ConversaService from '../services/conversaService';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';
import { DatabaseError } from '../utils/errors/DatabaseError';
import { conversaCriacaoSchema, conversaIdSchema, conversaQuerySchema } from '../utils/validations/conversaValidation';

class ConversaController {
  private service: ConversaService;

  constructor() {
    this.service = new ConversaService();
  }

  iniciarOuBuscar = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string;
      const dados = conversaCriacaoSchema.parse(req.body ?? {});
      const conversa = await this.service.iniciarOuBuscarConversa(userId, dados);
      return CommonResponse.created(res, conversa, 'Conversa criada ou encontrada com sucesso');
    } catch (error) {
      return this.handleError(res, error);
    }
  };

  listar = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string;
      const { page = 1, limite = 20 } = conversaQuerySchema.parse(req.query ?? {});
      const resultado = await this.service.listarConversas(userId, page, limite);
      return CommonResponse.success(res, resultado, HttpStatusCode.OK.code);
    } catch (error) {
      return this.handleError(res, error);
    }
  };

  obterPorId = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string;
      const conversaId = conversaIdSchema.parse(req.params.id);
      const conversa = await this.service.obterConversaPorId(conversaId, userId);
      return CommonResponse.success(res, conversa, HttpStatusCode.OK.code);
    } catch (error) {
      return this.handleError(res, error);
    }
  };

  private handleError(res: Response, error: unknown) {
    if (error instanceof ZodError) {
      return CommonResponse.error(
        res,
        HttpStatusCode.UNPROCESSABLE_ENTITY.code,
        null,
        null,
        error.issues,
        HttpStatusCode.UNPROCESSABLE_ENTITY.message,
      );
    }

    if (error instanceof DatabaseError) {
      return CommonResponse.error(
        res,
        error.statusCode,
        null,
        null,
        [error.toJSON()],
        error.message,
      );
    }

    if (error instanceof Error) {
      if (error.message.startsWith('FORBIDDEN:')) {
        return CommonResponse.error(
          res,
          HttpStatusCode.FORBIDDEN.code,
          null,
          null,
          [],
          error.message.replace('FORBIDDEN: ', ''),
        );
      }

      if (error.message.startsWith('VALIDATION:')) {
        return CommonResponse.error(
          res,
          HttpStatusCode.UNPROCESSABLE_ENTITY.code,
          null,
          null,
          [],
          error.message.replace('VALIDATION: ', ''),
        );
      }

      if (error.message === 'Conversa nao encontrada') {
        return CommonResponse.error(
          res,
          HttpStatusCode.NOT_FOUND.code,
          null,
          null,
          [],
          error.message,
        );
      }

      if (error.message === 'Aluno nao encontrado' || error.message === 'Treinador vinculado nao encontrado') {
        return CommonResponse.error(
          res,
          HttpStatusCode.NOT_FOUND.code,
          null,
          null,
          [],
          error.message,
        );
      }
    }

    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
  }
}

export default ConversaController;
