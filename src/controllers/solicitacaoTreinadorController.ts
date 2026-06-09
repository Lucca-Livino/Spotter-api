import { Request, Response } from "express";
import SolicitacaoTreinadorService from "../services/solicitacaoTreinadorService";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { ZodError } from "zod";
import { DatabaseError } from "../utils/errors/DatabaseError";

class SolicitacaoTreinadorController {
    private service: SolicitacaoTreinadorService;

    constructor() {
        this.service = new SolicitacaoTreinadorService();
    }

    criar = async (req: Request, res: Response) => {
        const userId = (req as any).user?.id as string | undefined;
        if (!userId) {
            return CommonResponse.error(res, HttpStatusCode.UNAUTHORIZED.code, null, null, [], "Não autorizado");
        }
        try {
            const resultado = await this.service.criar(userId, req.body);
            return CommonResponse.created(res, resultado, "Solicitação enviada com sucesso");
        } catch (error) {
            return this.handleError(res, error, "criar");
        }
    };

    buscarSolicitacaoDoAluno = async (req: Request, res: Response) => {
        const userId = (req as any).user?.id as string | undefined;
        if (!userId) {
            return CommonResponse.error(res, HttpStatusCode.UNAUTHORIZED.code, null, null, [], "Não autorizado");
        }
        try {
            const resultado = await this.service.buscarSolicitacaoDoAluno(userId);
            return CommonResponse.success(res, resultado, HttpStatusCode.OK.code);
        } catch (error) {
            return this.handleError(res, error, "buscarSolicitacaoDoAluno");
        }
    };

    listarParaTreinador = async (req: Request, res: Response) => {
        const userId = (req as any).user?.id as string | undefined;
        if (!userId) {
            return CommonResponse.error(res, HttpStatusCode.UNAUTHORIZED.code, null, null, [], "Não autorizado");
        }
        try {
            const resultado = await this.service.listarParaTreinador(userId, req.query);
            return CommonResponse.success(res, resultado, HttpStatusCode.OK.code);
        } catch (error) {
            return this.handleError(res, error, "listarParaTreinador");
        }
    };

    responder = async (req: Request, res: Response) => {
        const userId = (req as any).user?.id as string | undefined;
        const { id } = req.params;
        if (!userId) {
            return CommonResponse.error(res, HttpStatusCode.UNAUTHORIZED.code, null, null, [], "Não autorizado");
        }
        try {
            const resultado = await this.service.responder(id, userId, req.body);
            return CommonResponse.success(res, resultado, HttpStatusCode.OK.code, "Solicitação respondida com sucesso");
        } catch (error) {
            return this.handleError(res, error, "responder");
        }
    };

    private handleError(res: Response, error: unknown, context: string) {
        if (error instanceof ZodError) {
            return CommonResponse.error(res, HttpStatusCode.UNPROCESSABLE_ENTITY.code, null, null, error.issues, HttpStatusCode.UNPROCESSABLE_ENTITY.message);
        }
        if (error instanceof DatabaseError) {
            return CommonResponse.error(res, error.statusCode || 500, null, null, [error.toJSON()], error.message);
        }
        const msg = error instanceof Error ? error.message : "Erro desconhecido";
        if (msg.includes("CONFLITO:")) {
            return CommonResponse.error(res, HttpStatusCode.CONFLICT.code, null, null, [], msg.replace("CONFLITO: ", ""));
        }
        if (msg.includes("UNAUTHORIZED:")) {
            return CommonResponse.error(res, HttpStatusCode.UNAUTHORIZED.code, null, null, [], msg.replace("UNAUTHORIZED: ", ""));
        }
        if (msg.includes("não encontrad")) {
            return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], msg);
        }
        console.error(`[SolicitacaoController] [${context}] Erro interno:`, msg);
        return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
    }
}

export default SolicitacaoTreinadorController;
