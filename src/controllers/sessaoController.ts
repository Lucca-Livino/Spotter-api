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

    listSessoes = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.listSessoes(req.query, userId);
            return CommonResponse.success(res, resposta);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, error.issues, HttpStatusCode.UNPROCESSABLE_ENTITY.message);
            }
            if (error instanceof DatabaseError) {
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            if (error instanceof Error && error.message.startsWith('FORBIDDEN:')) {
                return CommonResponse.error(res, HttpStatusCode.FORBIDDEN.code, null, null, [], error.message.replace('FORBIDDEN: ', ''));
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[SessaoController] [listSessoes] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    getSessaoEmAndamento = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.getSessaoEmAndamento(userId);
            return CommonResponse.success(res, resposta);
        } catch (error) {
            if (error instanceof DatabaseError) {
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            if (error instanceof Error && error.message.startsWith('FORBIDDEN:')) {
                return CommonResponse.error(res, HttpStatusCode.FORBIDDEN.code, null, null, [], error.message.replace('FORBIDDEN: ', ''));
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[SessaoController] [getSessaoEmAndamento] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    getSessaoById = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.getSessaoById(req.params.id as string, userId);
            return CommonResponse.success(res, resposta);
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
                if (error.message === 'Sessão não encontrada') {
                    return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], error.message);
                }
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[SessaoController] [getSessaoById] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    finalizarSessao = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.finalizarSessao(req.params.id as string, userId);
            return CommonResponse.success(res, resposta);
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
                if (error.message.startsWith('UNPROCESSABLE:')) {
                    return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, [], error.message.replace('UNPROCESSABLE: ', ''));
                }
                if (error.message === 'Sessão não encontrada') {
                    return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], error.message);
                }
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[SessaoController] [finalizarSessao] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    cancelarSessao = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.cancelarSessao(req.params.id as string, userId);
            return CommonResponse.success(res, resposta);
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
                if (error.message.startsWith('UNPROCESSABLE:')) {
                    return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, [], error.message.replace('UNPROCESSABLE: ', ''));
                }
                if (error.message === 'Sessão não encontrada') {
                    return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], error.message);
                }
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[SessaoController] [cancelarSessao] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    updateSessao = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.updateSessao(req.params.id as string, req.body, userId);
            return CommonResponse.success(res, resposta);
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
                if (error.message === 'Sessão não encontrada') {
                    return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], error.message);
                }
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[SessaoController] [updateSessao] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    updateSessaoExercicio = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.updateSessaoExercicio(
                req.params.id as string,
                req.params.exercicioId as string,
                req.body,
                userId,
            );
            return CommonResponse.success(res, resposta);
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
                if (error.message === 'Sessão não encontrada' || error.message === 'Exercício não encontrado nesta sessão') {
                    return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], error.message);
                }
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[SessaoController] [updateSessaoExercicio] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    getSessaoResumo = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.getSessaoResumo(req.params.id as string, userId);
            return CommonResponse.success(res, resposta);
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
                if (error.message === 'Sessão não encontrada') {
                    return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], error.message);
                }
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[SessaoController] [getSessaoResumo] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }
}

export default SessaoController;
