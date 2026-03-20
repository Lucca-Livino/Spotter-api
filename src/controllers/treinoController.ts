import { Request, Response } from 'express';
import { ZodError } from 'zod';
import TreinoService from '../services/treinoService';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';
import { DatabaseError } from '../utils/errors/DatabaseError';

class TreinoController {
    private service: TreinoService;

    constructor() {
        this.service = new TreinoService();
    }

    createTreino = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.createTreino(req.body, userId);
            return CommonResponse.created(res, resposta, HttpStatusCode.CREATED.message);
        } catch (error) {
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

                if (error.message === 'Aluno não encontrado') {
                    return CommonResponse.error(
                        res,
                        HttpStatusCode.NOT_FOUND.code,
                        null,
                        null,
                        [],
                        error.message,
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
            }

            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[TreinoController] [createTreino] Erro interno:', msg);
            return CommonResponse.serverError(
                res,
                { message: msg },
                HttpStatusCode.INTERNAL_SERVER_ERROR.message,
            );
        }
    };

    getTreinoById = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.getTreinoById(
                req.params.id as string,
                userId,
                req.query,
            );
            return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.UNPROCESSABLE_ENTITY.code,
                    null,
                    null,
                    error.issues,
                    'Parâmetros de rota/query inválidos',
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

                if (error.message === 'Treino não encontrado') {
                    return CommonResponse.error(
                        res,
                        HttpStatusCode.NOT_FOUND.code,
                        null,
                        null,
                        [],
                        error.message,
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
            }

            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[TreinoController] [getTreinoById] Erro interno:', msg);
            return CommonResponse.serverError(
                res,
                { message: msg },
                HttpStatusCode.INTERNAL_SERVER_ERROR.message,
            );
        }
    };

    getAllTreinos = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.getAllTreinos(req.query, userId);
            return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.UNPROCESSABLE_ENTITY.code,
                    null,
                    null,
                    error.issues,
                    'Parâmetros de query inválidos',
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

            if (error instanceof Error && error.message.startsWith('FORBIDDEN:')) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.FORBIDDEN.code,
                    null,
                    null,
                    [],
                    error.message.replace('FORBIDDEN: ', ''),
                );
            }

            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[TreinoController] [getAllTreinos] Erro interno:', msg);
            return CommonResponse.serverError(
                res,
                { message: msg },
                HttpStatusCode.INTERNAL_SERVER_ERROR.message,
            );
        }
    };

    updateTreino = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.updateTreino(
                req.params.id as string,
                req.body,
                userId,
            );
            return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.UNPROCESSABLE_ENTITY.code,
                    null,
                    null,
                    error.issues,
                    'Parâmetros de rota/body inválidos',
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

                if (error.message === 'Treino não encontrado') {
                    return CommonResponse.error(
                        res,
                        HttpStatusCode.NOT_FOUND.code,
                        null,
                        null,
                        [],
                        error.message,
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
            }

            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[TreinoController] [updateTreino] Erro interno:', msg);
            return CommonResponse.serverError(
                res,
                { message: msg },
                HttpStatusCode.INTERNAL_SERVER_ERROR.message,
            );
        }
    };

    deleteTreino = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.deleteTreino(
                req.params.id as string,
                req.query,
                userId,
            );
            return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.UNPROCESSABLE_ENTITY.code,
                    null,
                    null,
                    error.issues,
                    'Parâmetros inválidos',
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

                if (error.message === 'Treino não encontrado') {
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
            console.error('[TreinoController] [deleteTreino] Erro interno:', msg);
            return CommonResponse.serverError(
                res,
                { message: msg },
                HttpStatusCode.INTERNAL_SERVER_ERROR.message,
            );
        }
    };
}

export default TreinoController;
