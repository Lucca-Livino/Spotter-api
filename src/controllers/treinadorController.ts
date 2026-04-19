import { Request, Response } from "express";
import TreinadorService from "../services/treinadorService";
import UploadService from "../services/uploadService";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { ZodError } from "zod";
import { DatabaseError } from "../utils/errors/DatabaseError";
import { type_treinador } from "../types/dbSchemas";

class TreinadorController {
        private service: TreinadorService;
        private uploadService: UploadService;

        constructor() {
                this.service = new TreinadorService();
                this.uploadService = new UploadService();
        }

        private async parseMultipartData(req: Request) {
                if (req.body.data) {
                        try {
                                return JSON.parse(req.body.data);
                        } catch (e) {
                                throw new Error('VALIDATION: Campo "data" deve ser um JSON válido');
                        }
                }
                return req.body;
        }

        private async uploadFoto(req: Request): Promise<string | null> {
                if (!req.file) return null;
                const uploaded = await this.uploadService.uploadFiles('fotos-perfil', [req.file as any]);
                return uploaded[0].url;
        }

        private async deleteFoto(url: string | null) {
                if (!url) return;
                try {
                        const urlParts = url.split('/');
                        const fileName = urlParts[urlParts.length - 1];
                        await this.uploadService.deleteFile('fotos-perfil', fileName);
                } catch (error) {
                        console.error('[TreinadorController] Erro ao deletar foto órfã:', error);
                }
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
	        let fotoUrl: string | null = null;
	        try {
	                console.log("[TreinadorController] [createTreinador] Requisição recebida");
	                const body = await this.parseMultipartData(req);

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

	                fotoUrl = await this.uploadFoto(req);

	                const novoTreinador: type_treinador = {
	                        user_id: userId,
	                        nome: body.nome,
	                        data_nascimento: body.data_nascimento,
	                        sexo: body.sexo,
	                        cref: body.cref,
	                        turnos: body.turnos,
	                        especializacao: body.especializacao,
	                        graduacao: body.graduacao,
	                        url_foto: fotoUrl || body.url_foto || null,
	                        status_conta: body.status_conta ?? true,
	                        academia_id: body.academia_id,
	                };

	                if (!novoTreinador.nome) {
	                        if (fotoUrl) await this.deleteFoto(fotoUrl);
	                        return CommonResponse.error(
	                                res,
	                                HttpStatusCode.BAD_REQUEST.code,
	                                null,
	                                "",
	                                [],
	                                "Dados do treinador são obrigatórios (nome)",
	                        );
	                }

	                const resposta = await this.service.createTreinador(novoTreinador);
	                return CommonResponse.created(
	                        res,
	                        resposta,
	                        HttpStatusCode.CREATED.message,
	                );
	        } catch (error) {
	                if (fotoUrl) await this.deleteFoto(fotoUrl);
	                return this.handleError(res, error, "createTreinador");
	        }
	};

	updateTreinador = async (req: Request, res: Response) => {
	        let fotoUrl: string | null = null;
	        try {
	                console.log("[TreinadorController] [updateTreinador] Requisição recebida");
	                const id = this.getRequestIdParam(req);
	                const body = await this.parseMultipartData(req);

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

	                fotoUrl = await this.uploadFoto(req);
				const treinadorEditadoBody: Record<string, unknown> = { ...body };
				const fotoResolvida = fotoUrl || body.url_foto;
				if (fotoResolvida !== undefined) {
					treinadorEditadoBody.url_foto = fotoResolvida;
				}

	                const treinadorAtualizado = await this.service.updateTreinador(
	                        id,
	                        treinadorEditadoBody,
	                );
	                return CommonResponse.success(
	                        res,
	                        treinadorAtualizado,
	                        HttpStatusCode.OK.code,
	                        "Treinador atualizado com sucesso",
	                );
	        } catch (error) {
	                if (fotoUrl) await this.deleteFoto(fotoUrl);
	                return this.handleError(res, error, "updateTreinador");
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

		if (errorMessage.toLowerCase().includes("corpo da requisição é obrigatório")) {
			return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, null, [], errorMessage);
		}

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
