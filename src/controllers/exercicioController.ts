import ExercicioService from "../services/exercicioService";
import { Request, Response } from "express";
import CommonResponse from "../utils/helpers/commonResponse";
import { ZodError } from "zod";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { DatabaseError } from "../utils/errors/DatabaseError";

class ExercicioController {
    private service: ExercicioService;
    constructor() {
        this.service = new ExercicioService();
    }

    createExercicio = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.createExercicio(req.body, userId);
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
                if (error.message === 'Já existe um exercício com este nome') {
                    return CommonResponse.error(res, HttpStatusCode.CONFLICT.code, null, 'nome', [], error.message);
                }
                if (error.message === 'Aluno não encontrado' || error.message.startsWith('Músculo(s) não encontrado(s)')) {
                    return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, [], error.message);
                }
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[ExercicioController] [createExercicio] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    getAllExercicios = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resultado = await this.service.getAllExercicios(req.query, userId);
            return CommonResponse.success(res, resultado, HttpStatusCode.OK.code);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, error.issues, HttpStatusCode.UNPROCESSABLE_ENTITY.message);
            }
            if (error instanceof DatabaseError) {
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            if (error instanceof Error && error.message.startsWith('VALIDATION:')) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.UNPROCESSABLE_ENTITY.code,
                    null,
                    null,
                    [],
                    error.message.replace('VALIDATION: ', ''),
                );
            }
            if (error instanceof Error && error.message.startsWith('FORBIDDEN:')) {
                return CommonResponse.error(res, HttpStatusCode.FORBIDDEN.code, null, null, [], error.message.replace('FORBIDDEN: ', ''));
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    getByIdExercicio = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.getByIdExercicio(req.params.id as string, userId);
            return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, 'id', error.issues, 'ID inválido');
            }
            if (error instanceof DatabaseError) {
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            if (error instanceof Error) {
                if (error.message === 'Exercício não encontrado') {
                    return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], error.message);
                }
                if (error.message.startsWith('FORBIDDEN:')) {
                    return CommonResponse.error(res, HttpStatusCode.FORBIDDEN.code, null, null, [], error.message.replace('FORBIDDEN: ', ''));
                }
            }
            return CommonResponse.serverError(res, error);
        }
    }

    updateExercicio = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const resposta = await this.service.updateExercicio(req.params.id as string, req.body, userId);
            return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, error.issues, HttpStatusCode.UNPROCESSABLE_ENTITY.message);
            }
            if (error instanceof DatabaseError) {
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            if (error instanceof Error) {
                if (error.message === 'Exercício não encontrado') {
                    return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], error.message);
                }
                if (error.message.startsWith('FORBIDDEN:')) {
                    return CommonResponse.error(res, HttpStatusCode.FORBIDDEN.code, null, null, [], error.message.replace('FORBIDDEN: ', ''));
                }
                if (error.message === 'Já existe um exercício com este nome') {
                    return CommonResponse.error(res, HttpStatusCode.CONFLICT.code, null, 'nome', [], error.message);
                }
                if (error.message.startsWith('Músculo(s) não encontrado(s)')) {
                    return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, [], error.message);
                }
            }
            return CommonResponse.serverError(res, error, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    deleteExercicio = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id as string;
            const soft = req.query.soft === 'true';
            const force = req.query.force === 'true';

            const resposta = await this.service.deleteExercicio(req.params.id as string, { soft, force, userId });
            return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, 'id', error.issues, 'ID inválido');
            }
            if (error instanceof DatabaseError) {
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            if (error instanceof Error) {
                if (error.message === 'Exercício não encontrado') {
                    return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], error.message);
                }
                if (error.message.startsWith('FORBIDDEN:')) {
                    return CommonResponse.error(res, HttpStatusCode.FORBIDDEN.code, null, null, [], error.message.replace('FORBIDDEN: ', ''));
                }
                if (error.message.startsWith('Exercício está vinculado a')) {
                    return CommonResponse.error(res, HttpStatusCode.CONFLICT.code, null, null, [], error.message);
                }
            }
            return CommonResponse.serverError(res, error, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }
}

export default ExercicioController;
