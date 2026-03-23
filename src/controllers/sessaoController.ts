import SessaoService from '../services/sessaoService';
import { Request, Response } from 'express';
import CommonResponse from '../utils/helpers/commonResponse';
import { ZodError } from 'zod';
import HttpStatusCode from '../utils/helpers/httpStatusCode';
import { DatabaseError } from '../utils/errors/DatabaseError';

class SessaoController {
    private service: SessaoService;

    constructor() {
        this.service = new SessaoService();
    }

    createSessao = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.createSessao(req.body, userId);
            return CommonResponse.created(res, resposta, HttpStatusCode.CREATED.message);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, error.issues, HttpStatusCode.UNPROCESSABLE_ENTITY.message);
            }
            if (error instanceof DatabaseError) {
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            if (error instanceof Error) {
                if (error.message.startsWith('FORBIDDEN:')) {
                    return CommonResponse.error(res, HttpStatusCode.FORBIDDEN.code, null, null, [], error.message.replace('FORBIDDEN: ', ''));
                }
                if (error.message.startsWith('CONFLICT:')) {
                    return CommonResponse.error(res, HttpStatusCode.CONFLICT.code, null, null, [], error.message.replace('CONFLICT: ', ''));
                }
                if (error.message === 'Treino não encontrado ou não pertence ao aluno autenticado') {
                    return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, 'treino_id', [], error.message);
                }
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[SessaoController] [createSessao] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }
}

export default SessaoController;
