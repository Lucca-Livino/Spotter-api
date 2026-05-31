import { type_academia } from "../types/dbSchemas";
import AcademiaService from "../services/academiaService";
import { Request, Response } from "express";
import CommonResponse from "../utils/helpers/commonResponse";
import { ZodError } from "zod";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { DatabaseError } from "../utils/errors/DatabaseError";

class AcademiaController {
  private service: AcademiaService;
  constructor() {
    this.service = new AcademiaService();
  }

  createAcademia = async (req: Request, res: Response) => {
    try {
      const novaAcademia: type_academia = {
        nome: req.body.nome,
        endereco_numero: req.body.endereco_numero,
        endereco_rua: req.body.endereco_rua,
        endereco_bairro: req.body.endereco_bairro,
        endereco_cidade: req.body.endereco_cidade,
        endereco_estado: req.body.endereco_estado,
        created_at: new Date(),
      };

      if (!novaAcademia.nome) {
        return CommonResponse.error(
          res,
          HttpStatusCode.UNPROCESSABLE_ENTITY.code,
          null,
          "nome",
          [],
          "Dados da academia é obrigatório (nome)",
        );
      }

      const resposta = await this.service.createAcademia(novaAcademia);
      return CommonResponse.created(
        res,
        resposta,
        HttpStatusCode.CREATED.message,
      );
    } catch (error) {
      return this.handleError(res, error, "createAcademia");
    }
  };

  getAllAcademia = async (req: Request, res: Response) => {
    try {
      const resposta = await this.service.getAllAcademias(req.query);
      return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
    } catch (error) {
      return this.handleError(res, error, "getAllAcademia");
    }
  };

  getAcademiaById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      if (!id) {
        return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'id', [], 'O id é obrigatório');
      }

      const resposta = await this.service.getAcademiaById(id);
      return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
    } catch (error) {
      return this.handleError(res, error, "getAcademiaById");
    }
  };

  updateAcademia = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const academiaEditadaBody = req.body
      if (!id) {
        return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'id', [], 'O id é obrigatório');
      }

      if (!academiaEditadaBody || Object.keys(academiaEditadaBody).length === 0) {
        return CommonResponse.error(
          res,
          HttpStatusCode.BAD_REQUEST.code,
          null,
          "",
          [],
          "Corpo da requisição é obrigatório",
        );
      }

      const resposta = await this.service.updateAcademia(
        id,
        academiaEditadaBody,
      );
      return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
    } catch (error) {
      return this.handleError(res, error, "updateAcademia");
    }
  };

  deleteAcademia = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      if (!id) {
        return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'id', [], 'O id é obrigatório');
      }

      const resposta = await this.service.deleteAcademia(id);
      return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
    } catch (error) {
      return this.handleError(res, error, "deleteAcademia");
    }
  };

  private handleError(res: Response, error: unknown, context: string) {
    if (error instanceof ZodError) {
      console.warn(`[AcademiaController] [${context}] Erro de validação Zod:`, error.issues);
      return CommonResponse.error(
        res,
        HttpStatusCode.UNPROCESSABLE_ENTITY.code,
        null,
        null,
        error.issues,
        HttpStatusCode.UNPROCESSABLE_ENTITY.message,
      );
    }

    if (error instanceof DatabaseError || (error as any)?.name === 'DatabaseError') {
      const dbError = error as DatabaseError;
      console.warn(`[AcademiaController] [${context}] DatabaseError:`, dbError.message);
      return CommonResponse.error(
        res,
        dbError.statusCode || 500,
        null,
        null,
        [dbError.toJSON()],
        dbError.message,
      );
    }

    const msg = error instanceof Error ? error.message : "Erro desconhecido";

    if (msg.startsWith("FORBIDDEN:")) {
      return CommonResponse.error(res, HttpStatusCode.FORBIDDEN.code, null, null, [], msg.replace("FORBIDDEN: ", ""));
    }

    if (msg.includes("não encontrado") || msg.includes("não encontrada")) {
      return CommonResponse.error(res, HttpStatusCode.NOT_FOUND.code, null, null, [], msg);
    }

    console.error(`[AcademiaController] [${context}] Erro interno:`, msg);
    return CommonResponse.serverError(
      res,
      { message: msg },
      HttpStatusCode.INTERNAL_SERVER_ERROR.message,
    );
  }
}

export default AcademiaController;
