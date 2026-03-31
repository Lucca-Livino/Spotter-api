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
    const novaAcademia: type_academia = {
      nome: req.body.nome,
      endereco_numero: req.body.endereco_numero,
      endereco_rua: req.body.endereco_rua,
      endereco_bairro: req.body.endereco_bairro,
      endereco_cidade: req.body.endereco_cidade,
      endereco_estado: req.body.endereco_estado,
      created_at: new Date(),
    };
    if (!novaAcademia) {
      return CommonResponse.error(
        res,
        HttpStatusCode.BAD_REQUEST.code,
        null,
        "",
        [],
        "Dados da academia é obrigatório",
      );
    }

    try {
      const resposta = await this.service.createAcademia(novaAcademia);
      return CommonResponse.created(
        res,
        resposta,
        HttpStatusCode.CREATED.message,
      );
    } catch (error) {
      if (error instanceof ZodError) {
        console.warn(
          "[AcademiaController] [createAcademia] Erro de validação Zod:",
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
          "[AcademiaController] [createAcademia] DatabaseError:",
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
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[AcademiaController] [createAcademia] Erro interno:", msg);
      return CommonResponse.serverError(
        res,
        { message: msg },
        HttpStatusCode.INTERNAL_SERVER_ERROR.message,
      );
    }
  };

  getAllAcademia = async (req: Request, res: Response) => {
    try {
      const resposta = await this.service.getAllAcademias(req.query);
      return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
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
  };

    getAcademiaById = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        console.log(`[Controller] id:${id}`)
        if (!id) {
            return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'id', [], 'O id é obrigatório');
        }

    console.log(`[Controller] id:${id}`);
    try {
      const resposta = await this.service.getAcademiaById(id);
      return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
    } catch (error) {
      if (error instanceof Error) {
        return CommonResponse.error(
          res,
          HttpStatusCode.NOT_FOUND.code,
          null,
          null,
          [],
          "Academia não encontrada",
        );
      }
      return CommonResponse.serverError(res, error);
    }
  };

    updateAcademia = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const academiaEditadaBody = req.body
        if (!id) {
            return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'id', [], 'O id é obrigatório');
        }

    if (!academiaEditadaBody) {
      return CommonResponse.error(
        res,
        HttpStatusCode.BAD_REQUEST.code,
        null,
        "",
        [],
        "Corpo da requisição é obrigatório",
      );
    }

    try {
      const resposta = await this.service.updateAcademia(
        id,
        academiaEditadaBody,
      );
      return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
    } catch (error) {
      if (error instanceof ZodError) {
        return CommonResponse.error(
          res,
          HttpStatusCode.UNPROCESSABLE_ENTITY.code,
          null,
          null,
          error.issues,
          HttpStatusCode.UNPROCESSABLE_ENTITY.message,
        );
      }
      return CommonResponse.serverError(
        res,
        error,
        HttpStatusCode.INTERNAL_SERVER_ERROR.message,
      );
    }
  };

    deleteAcademia = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        if (!id) {
            return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, 'id', [], 'O id é obrigatório');
        }

    try {
      const resposta = await this.service.deleteAcademia(id);
      return CommonResponse.success(res, resposta, HttpStatusCode.OK.code);
    } catch (error) {
      console.error(
        "[AcademiaController] [deleteAcademia] Erro interno:",
        error,
      );
      return CommonResponse.serverError(
        res,
        error,
        HttpStatusCode.INTERNAL_SERVER_ERROR.message,
      );
    }
  };
}

export default AcademiaController;
