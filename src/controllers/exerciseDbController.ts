import { Request, Response } from "express";
import ExerciseDbService from "../services/exerciseDbService";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { DatabaseError } from "../utils/errors/DatabaseError";

class ExerciseDbController {
    private service: ExerciseDbService;

    constructor() {
        this.service = new ExerciseDbService();
    }

    private handleError(res: Response, error: unknown, contexto: string) {
        if (error instanceof Error) {
            if (error.message.startsWith('CONFIG:')) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.SERVICE_UNAVAILABLE.code,
                    null, null, [],
                    error.message.replace('CONFIG: ', ''),
                );
            }
            if (error.message.startsWith('AUTH:')) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.BAD_GATEWAY.code,
                    null, null, [],
                    error.message.replace('AUTH: ', ''),
                );
            }
            if (error.message.startsWith('RATE_LIMIT:')) {
                return CommonResponse.error(
                    res,
                    429,
                    null, null, [],
                    error.message.replace('RATE_LIMIT: ', ''),
                );
            }
            if (error.message.startsWith('UPSTREAM:')) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.BAD_GATEWAY.code,
                    null, null, [],
                    error.message.replace('UPSTREAM: ', ''),
                );
            }
        }
        if (error instanceof DatabaseError) {
            return CommonResponse.error(res, error.statusCode, null, null, [error.toJSON()], error.message);
        }
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`[ExerciseDbController] [${contexto}] Erro interno:`, msg);
        return CommonResponse.serverError(res, { message: msg }, HttpStatusCode.INTERNAL_SERVER_ERROR.message);
    }

    private parsePositiveInt(val: unknown, padrao: number, max?: number): number {
        const n = Number(val);
        if (!Number.isFinite(n) || n < 1) return padrao;
        const inteiro = Math.floor(n);
        return max ? Math.min(inteiro, max) : inteiro;
    }

    // Consultas (proxy)

    search = async (req: Request, res: Response) => {
        try {
            const nome = String(req.query.name || '').trim();
            if (!nome) {
                return CommonResponse.error(
                    res,
                    HttpStatusCode.BAD_REQUEST.code,
                    null, 'name', [],
                    'Parâmetro "name" é obrigatório.',
                );
            }
            const limit = this.parsePositiveInt(req.query.limit, 10, 50);
            const offset = this.parsePositiveInt(req.query.offset, 1, 1000) - 1;
            const resultados = await this.service.searchByName(nome, limit, offset);
            return CommonResponse.success(res, resultados, HttpStatusCode.OK.code);
        } catch (error) {
            return this.handleError(res, error, 'search');
        }
    }

    getBodyParts = async (_req: Request, res: Response) => {
        try {
            const lista = await this.service.getBodyPartList();
            return CommonResponse.success(res, lista, HttpStatusCode.OK.code);
        } catch (error) {
            return this.handleError(res, error, 'getBodyParts');
        }
    }

    getByBodyPart = async (req: Request, res: Response) => {
        try {
            const bodyPart = String(req.params.bodyPart || '').trim();
            if (!bodyPart) {
                return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'bodyPart', [], 'Parâmetro bodyPart é obrigatório.');
            }
            const limit = this.parsePositiveInt(req.query.limit, 10, 50);
            const offset = this.parsePositiveInt(req.query.offset, 1, 1000) - 1;
            const resultados = await this.service.getByBodyPart(bodyPart, limit, offset);
            return CommonResponse.success(res, resultados, HttpStatusCode.OK.code);
        } catch (error) {
            return this.handleError(res, error, 'getByBodyPart');
        }
    }

    getTargets = async (_req: Request, res: Response) => {
        try {
            const lista = await this.service.getTargetList();
            return CommonResponse.success(res, lista, HttpStatusCode.OK.code);
        } catch (error) {
            return this.handleError(res, error, 'getTargets');
        }
    }

    getByTarget = async (req: Request, res: Response) => {
        try {
            const target = String(req.params.target || '').trim();
            if (!target) {
                return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'target', [], 'Parâmetro target é obrigatório.');
            }
            const limit = this.parsePositiveInt(req.query.limit, 10, 50);
            const offset = this.parsePositiveInt(req.query.offset, 1, 1000) - 1;
            const resultados = await this.service.getByTarget(target, limit, offset);
            return CommonResponse.success(res, resultados, HttpStatusCode.OK.code);
        } catch (error) {
            return this.handleError(res, error, 'getByTarget');
        }
    }

    getEquipments = async (_req: Request, res: Response) => {
        try {
            const lista = await this.service.getEquipmentList();
            return CommonResponse.success(res, lista, HttpStatusCode.OK.code);
        } catch (error) {
            return this.handleError(res, error, 'getEquipments');
        }
    }

    getByEquipment = async (req: Request, res: Response) => {
        try {
            const equipment = String(req.params.equipment || '').trim();
            if (!equipment) {
                return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'equipment', [], 'Parâmetro equipment é obrigatório.');
            }
            const limit = this.parsePositiveInt(req.query.limit, 10, 50);
            const offset = this.parsePositiveInt(req.query.offset, 1, 1000) - 1;
            const resultados = await this.service.getByEquipment(equipment, limit, offset);
            return CommonResponse.success(res, resultados, HttpStatusCode.OK.code);
        } catch (error) {
            return this.handleError(res, error, 'getByEquipment');
        }
    }

    // Sincronização (admin-only)

    syncMusculos = async (_req: Request, res: Response) => {
        try {
            const resultado = await this.service.syncMusculos();
            return CommonResponse.success(res, resultado, HttpStatusCode.OK.code, 'Músculos sincronizados com sucesso');
        } catch (error) {
            return this.handleError(res, error, 'syncMusculos');
        }
    }

    syncAparelhos = async (_req: Request, res: Response) => {
        try {
            const resultado = await this.service.syncAparelhos();
            return CommonResponse.success(res, resultado, HttpStatusCode.OK.code, 'Aparelhos sincronizados com sucesso');
        } catch (error) {
            return this.handleError(res, error, 'syncAparelhos');
        }
    }

    syncExercicios = async (req: Request, res: Response) => {
        try {
            const limit = this.parsePositiveInt(req.query.limit, 10, 100);
            const offset = this.parsePositiveInt(req.query.offset, 1, 2000) - 1;
            const cachearMidia = req.query.cachear_midia === 'true';
            this.service.resetRequests();
            const resultado = await this.service.syncExercicios(limit, offset, { cachearMidia });
            return CommonResponse.success(
                res,
                { ...resultado, requests_api_utilizadas: this.service.getRequestsRealizadas() },
                HttpStatusCode.OK.code,
                `Batch sincronizado: ${resultado.sincronizados} novo(s), ${resultado.ja_existiam} já existiam.`,
            );
        } catch (error) {
            return this.handleError(res, error, 'syncExercicios');
        }
    }

    syncCompleto = async (req: Request, res: Response) => {
        try {
            const maxExercicios = this.parsePositiveInt(req.query.max_exercicios, 100, 1500);
            const cachearMidia = req.query.cachear_midia === 'true';
            const resultado = await this.service.syncCompleto({ max_exercicios: maxExercicios, cachearMidia });
            return CommonResponse.success(
                res,
                resultado,
                HttpStatusCode.OK.code,
                'Sincronização completa executada.',
            );
        } catch (error) {
            return this.handleError(res, error, 'syncCompleto');
        }
    }
}

export default ExerciseDbController;
