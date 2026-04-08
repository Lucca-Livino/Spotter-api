import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import MensagemConversaService from '../services/mensagemConversaService';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';
import { DatabaseError } from '../utils/errors/DatabaseError';
import { conversaIdSchema } from '../utils/validations/conversaValidation';
import { envioMensagemConversaSchema, mensagemConversaQuerySchema } from '../utils/validations/mensagemConversaValidation';
import { emitirMensagensLidas, emitirNovaMensagem } from '../config/socketIo';

class MensagemConversaController {
  private service: MensagemConversaService;

  constructor() {
    this.service = new MensagemConversaService();
  }

  enviar = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string;
      const conversaId = conversaIdSchema.parse(req.params.conversaId);
      const { conteudo } = envioMensagemConversaSchema.parse(req.body ?? {});

      const mensagem = await this.service.enviarMensagem(conversaId, userId, conteudo);
      emitirNovaMensagem(conversaId, mensagem);

      return CommonResponse.created(res, mensagem, 'Mensagem enviada com sucesso');
    } catch (error) {
      return this.handleError(res, error);
    }
  };

  listar = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string;
      const conversaId = conversaIdSchema.parse(req.params.conversaId);
      const { page = 1, limite = 30 } = mensagemConversaQuerySchema.parse(req.query ?? {});

      const resultado = await this.service.listarMensagens(conversaId, userId, page, limite);
      return CommonResponse.success(res, resultado, HttpStatusCode.OK.code);
    } catch (error) {
      return this.handleError(res, error);
    }
  };

  marcarComoLidas = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string;
      const conversaId = conversaIdSchema.parse(req.params.conversaId);

      const resultado = await this.service.marcarComoLidas(conversaId, userId);
      emitirMensagensLidas(conversaId, userId, resultado.marcadas);

      return CommonResponse.success(res, resultado, HttpStatusCode.OK.code, 'Mensagens marcadas como lidas');
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
    }

    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
  }
}

export default MensagemConversaController;
