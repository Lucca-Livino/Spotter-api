import MusculoService from "../services/musculoService";
import { Request, Response } from "express";
import CommonResponse from "../utils/helpers/commonResponse";
import { ZodError } from "zod";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { DatabaseError } from "../utils/errors/DatabaseError";

class MusculoController {
    private service: MusculoService;
    constructor() {
        this.service = new MusculoService();
    }

    getAll = async (req: Request, res: Response) => {
        try {
            const resultado = await this.service.getAll(req.query);
            return CommonResponse.success(res, resultado, HttpStatusCode.OK.code);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, error.issues, HttpStatusCode.UNPROCESSABLE_ENTITY.message);
            }
            if (error instanceof DatabaseError) {
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
        }
    }

    getById = async (req: Request, res: Response) => {
        try {
            const resposta = await this.service.getById(req.params.id as string);
            return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
        } catch (error) {
            if (error instanceof ZodError) {
                return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, 'id', error.issues, 'ID inválido');
            }
            if (error instanceof DatabaseError) {
                return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
            }
            if (error instanceof Error && error.message === 'Músculo não encontrado') {
                return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], error.message);
            }
            return CommonResponse.serverError(res, error);
        }
    }
}

export default MusculoController;
