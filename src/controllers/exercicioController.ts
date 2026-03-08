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
            const resposta = await this.service.createExercicio(req.body);
            return CommonResponse.created(res, resposta, HttpStatusCode.CREATED.message);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, error.issues, HttpStatusCode.UNPROCESSABLE_ENTITY.message);
            }
            if (error instanceof DatabaseError) {
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            if (error instanceof Error && error.message === 'Já existe um exercício com este nome') {
                return CommonResponse.error(res, HttpStatusCode.CONFLICT.code, null, 'nome', [], error.message);
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('[ExercicioController] [createExercicio] Erro interno:', msg);
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }
}

export default ExercicioController;
