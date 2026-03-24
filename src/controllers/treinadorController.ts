import { Request, Response } from "express";
import TreinadorService from "../services/treinadorService";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { ZodError } from "zod";
import { DatabaseError } from "../utils/errors/DatabaseError";

class TreinadorController {
	private service: TreinadorService;

	constructor() {
		this.service = new TreinadorService();
	}

	getAllTreinadores = async (req: Request, res: Response) => {
		console.log("[TreinadorController] [getAllTreinadores] Requisição recebida");

		try {
			const treinadores = await this.service.getAllTreinadores();
			return CommonResponse.success(
				res,
				{
					total: treinadores.length,
					treinadores,
				},
				HttpStatusCode.OK.code,
				`${treinadores.length} treinador(es) encontrado(s)`,
			);
		} catch (error) {
			return this.handleError(res, error, "getAllTreinadores");
		}
	};



	private handleError(res: Response, error: unknown, context: string) {
		if (error instanceof ZodError) {
			console.warn(
				`[TreinadorController] [${context}] Erro de validação Zod:`,
				error.issues,
			);
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
			console.warn(
				`[TreinadorController] [${context}] DatabaseError:`,
				error.message,
			);
			return CommonResponse.error(
				res,
				error.statusCode,
				null,
				null,
				[error.toJSON()],
				error.message,
			);
		}

		const errorMessage =
			error instanceof Error ? error.message : "Erro desconhecido";

		if (errorMessage.includes("não encontrado")) {
			console.warn(
				`[TreinadorController] [${context}] Recurso não encontrado:`,
				errorMessage,
			);
			return CommonResponse.error(
				res,
				HttpStatusCode.NOT_FOUND.code,
				null,
				null,
				[],
				errorMessage,
			);
		}

		console.error(
			`[TreinadorController] [${context}] Erro interno:`,
			errorMessage,
		);
		return CommonResponse.serverError(
			res,
			{ message: errorMessage },
			HttpStatusCode.INTERNAL_SERVER_ERROR.message,
		);
	}


}

export default TreinadorController;
