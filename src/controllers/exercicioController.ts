import ExercicioService from "../services/exercicioService";
import UploadService from "../services/uploadService";
import { Request, Response } from "express";
import CommonResponse from "../utils/helpers/commonResponse";
import { ZodError } from "zod";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { DatabaseError } from "../utils/errors/DatabaseError";

class ExercicioController {
    private service: ExercicioService;
    private uploadService: UploadService;

    constructor() {
        this.service = new ExercicioService();
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

    private async uploadAnimacao(req: Request): Promise<string | null> {
        if (!req.file) return null;
        const uploaded = await this.uploadService.uploadFiles('animacoes', [req.file as any]);
        return uploaded[0].url;
    }

    private async deleteAnimacao(url: string | null) {
        if (!url) return;
        try {
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            await this.uploadService.deleteFile('animacoes', fileName);
        } catch (error) {
            console.error('[ExercicioController] Erro ao deletar animação órfã:', error);
        }
    }

    private handleMulterError(res: Response, error: unknown): boolean {
        if (!(error instanceof Error)) return false;
        if (error.message.includes('são permitidos')) {
            CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'animacao', [], error.message);
            return true;
        }
        if ((error as any).code === 'LIMIT_FILE_SIZE') {
            CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'animacao', [], 'Arquivo excede o tamanho máximo permitido');
            return true;
        }
        return false;
    }

    createExercicio = async (req: Request, res: Response) => {
        let animacaoUrl: string | null = null;
        try {
            const userId = (req as any).user?.id as string;
            const body = await this.parseMultipartData(req);

            animacaoUrl = await this.uploadAnimacao(req);
            const dadosParaCriar = { ...body, animacao_url: animacaoUrl || body.animacao_url };

            const resposta = await this.service.createExercicio(dadosParaCriar, userId);
            return CommonResponse.created(res, resposta, HttpStatusCode.CREATED.message);
        } catch (error) {
            if (animacaoUrl) await this.deleteAnimacao(animacaoUrl);

            if (this.handleMulterError(res, error)) return;

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
                if (
                    error.message === 'Aluno não encontrado' ||
                    error.message.startsWith('Músculo(s) não encontrado(s)') ||
                    error.message.startsWith('Aparelho(s) não encontrado(s)')
                ) {
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
        let animacaoUrl: string | null = null;
        try {
            const userId = (req as any).user?.id as string;
            const body = await this.parseMultipartData(req);

            // Buscar URL antiga se houver substituição ou remoção explícita
            let animacaoAntiga: string | null = null;
            const haveraSubstituicao = !!req.file;
            const haveraRemocaoExplicita = body.animacao_url === null && !req.file;

            if (haveraSubstituicao || haveraRemocaoExplicita) {
                try {
                    const exercicioAtual = await this.service.getByIdExercicio(req.params.id as string, userId);
                    animacaoAntiga = exercicioAtual?.animacao_url ?? null;
                } catch {
                    // Ignora erros de leitura; update abaixo trata a ausência
                }
            }

            animacaoUrl = await this.uploadAnimacao(req);
            const dadosParaAtualizar: Record<string, unknown> = { ...body };
            const animacaoResolvida = animacaoUrl ?? body.animacao_url;
            if (animacaoResolvida !== undefined) {
                dadosParaAtualizar.animacao_url = animacaoResolvida;
            }

            const resposta = await this.service.updateExercicio(req.params.id as string, dadosParaAtualizar, userId);

            // Após sucesso do update: limpar animação antiga do S3
            if ((animacaoUrl || haveraRemocaoExplicita) && animacaoAntiga) {
                await this.deleteAnimacao(animacaoAntiga);
            }

            return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
        } catch (error) {
            if (animacaoUrl) await this.deleteAnimacao(animacaoUrl);

            if (this.handleMulterError(res, error)) return;

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
                if (
                    error.message.startsWith('Músculo(s) não encontrado(s)') ||
                    error.message.startsWith('Aparelho(s) não encontrado(s)')
                ) {
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

            // Buscar URL da animação ANTES da exclusão para limpeza posterior
            let animacaoParaRemover: string | null = null;
            try {
                const exercicioExistente = await this.service.getByIdExercicio(req.params.id as string, userId);
                animacaoParaRemover = exercicioExistente?.animacao_url ?? null;
            } catch {
                // Ignora erros de leitura; delete abaixo valida existência e permissão
            }

            const resposta = await this.service.deleteExercicio(req.params.id as string, { soft, force, userId });

            // Soft delete preserva o arquivo (permite reativação futura); hard/cascade removem.
            if (resposta.tipo_exclusao !== 'soft' && animacaoParaRemover) {
                await this.deleteAnimacao(animacaoParaRemover);
            }

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
