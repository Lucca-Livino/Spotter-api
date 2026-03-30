import { Request, Response } from "express";
import TreinadorService from "../services/treinadorService";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { ZodError } from "zod";
import { DatabaseError } from "../utils/errors/DatabaseError";
import { type_treinador } from "../types/dbSchemas";

class TreinadorController {
	private service: TreinadorService;

	constructor() {
		this.service = new TreinadorService();
	}

	getAllTreinadores = async (req: Request, res: Response) => {
		console.log("[TreinadorController] [getAllTreinadores] Requisição recebida");

		try {
			const resultado = await this.service.getAllTreinadores(req.query);
			return CommonResponse.success(res, resultado, HttpStatusCode.OK.code);
		} catch (error) {
			return this.handleError(res, error, "getAllTreinadores");
		}
	};

	getTreinadorById = async (req: Request, res: Response) => {
		console.log("[TreinadorController] [getTreinadorById] Requisição recebida");
		const id = this.getRequestIdParam(req);

		if (!id) {
			return CommonResponse.error(
				res,
				HttpStatusCode.BAD_REQUEST.code,
				null,
				"id",
				[],
				"O id é obrigatório",
			);
		}

		try {
			const treinador = await this.service.getTreinadorById(id);
			return CommonResponse.success(
				res,
				treinador,
				HttpStatusCode.OK.code,
				"Treinador encontrado com sucesso",
			);
		} catch (error) {
			return this.handleError(res, error, "getTreinadorById");
		}
	};

	createTreinador = async (req: Request, res: Response) => {
		console.log("[TreinadorController] [createTreinador] Requisição recebida");

		const usuarioAutenticado = (req as any).user;
		const userId = usuarioAutenticado?.id;

		if (!userId) {
			return CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				null,
				null,
				[],
				"Usuário não autenticado",
			);
		}

		const novoTreinador: type_treinador = {
			user_id: userId,
			nome: req.body.nome,
			data_nascimento: req.body.data_nascimento,
			sexo: req.body.sexo,
			cref: req.body.cref,
			turnos: req.body.turnos,
			especializacao: req.body.especializacao,
			graduacao: req.body.graduacao,
			url_foto: req.body.url_foto || null,
			status_conta: req.body.status_conta ?? true,
			academia_id: req.body.academia_id,
		};

		if (!novoTreinador.nome) {
			return CommonResponse.error(
				res,
				HttpStatusCode.BAD_REQUEST.code,
				null,
				"",
				[],
				"Dados do treinador são obrigatórios (nome)",
			);
		}

		try {
			const resposta = await this.service.createTreinador(novoTreinador);
			return CommonResponse.created(
				res,
				resposta,
				HttpStatusCode.CREATED.message,
			);
		} catch (error) {
			return this.handleError(res, error, "createTreinador");
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

	private getRequestIdParam(req: Request): string | null {
		const { id } = req.params;
		if (Array.isArray(id)) {
			return id[0] ?? null;
		}

		return id ?? null;
	}
}

export default TreinadorController;
