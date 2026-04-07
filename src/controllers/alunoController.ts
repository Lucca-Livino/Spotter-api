import { Request, Response } from "express";
import AlunosService from "../services/alunoService";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { ZodError } from "zod";
import { DatabaseError } from "../utils/errors/DatabaseError";
import { type_aluno } from "../types/dbSchemas";

class AlunoController {
  private service: AlunosService;

  constructor() {
    this.service = new AlunosService();
  }

  getAllAlunos = async (req: Request, res: Response) => {
    console.log("[AlunoController] [getAllAlunos] Requisição recebida");

    try {
      const resultado = await this.service.getAllAlunos(req.query);
      return CommonResponse.success(res, resultado, HttpStatusCode.OK.code);
    } catch (error) {
      return this.handleError(res, error, "getAllAlunos");
    }
  };

  getAlunoById = async (req: Request, res: Response) => {
    console.log("[AlunoController] [getAlunoById] Requisição recebida");
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
      const Aluno = await this.service.getAlunoById(id);
      return CommonResponse.success(
        res,
        Aluno,
        HttpStatusCode.OK.code,
        "Aluno encontrado com sucesso",
      );
    } catch (error) {
      return this.handleError(res, error, "getAlunoById");
    }
  };

  createAluno = async (req: Request, res: Response) => {
    console.log("[AlunosController] [createAluno] Requisição recebida");
    console.log(
      "[AlunosController] [createAluno] Body:",
      JSON.stringify(req.body, null, 2),
    );

    const novoAluno: type_aluno = {
      user_id: req.body.user_id,
      nome: req.body.nome,
      data_nascimento: req.body.data_nascimento,
      sexo: req.body.sexo,
      url_foto: req.body.url_foto || null,
      status_conta: req.body.status_conta ?? true,
      academia_id: req.body.academia_id,
      treinador_id: req.body.treinador_id ?? null,
    };

    console.log(
      "[AlunosController] [createAluno] Objeto montado:",
      JSON.stringify(novoAluno, null, 2),
    );

    if (!novoAluno.nome || !novoAluno.user_id) {
      console.warn(
        "[AlunosController] [createAluno] Dados obrigatórios ausentes, retornando BAD_REQUEST",
      );
      return CommonResponse.error(
        res,
        HttpStatusCode.BAD_REQUEST.code,
        null,
        "",
        [],
        "Dados do aluno são obrigatórios (user_id, nome)",
      );
    }

    try {
      console.log(
        "[AlunosController] [createAluno] Chamando service.createAluno...",
      );
      const resposta = await this.service.createAluno(novoAluno);
      console.log(
        "[AlunosController] [createAluno] Aluno criado com sucesso. Resposta:",
        JSON.stringify(resposta, null, 2),
      );
      return CommonResponse.created(
        res,
        resposta,
        HttpStatusCode.CREATED.message,
      );
    } catch (error) {
      return this.handleError(res, error, "createAluno");
    }
  };

  deleteAluno = async (req: Request, res: Response) => {
    console.log("[AlunoController] [deleteAluno] Requisição recebida");
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
      const alunoDeletado = await this.service.deleteAluno(id);
      return CommonResponse.success(
        res,
        alunoDeletado,
        HttpStatusCode.OK.code,
        "Aluno deletado com sucesso",
      );
    } catch (error) {
      return this.handleError(res, error, "deleteAluno");
    }
  };

  updateAluno = async (req: Request, res: Response) => {
    console.log("[AlunoController] [updateAluno] Requisição recebida");
    const id = this.getRequestIdParam(req);
    const alunoEditadoBody = req.body;

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

    if (!alunoEditadoBody || Object.keys(alunoEditadoBody).length === 0) {
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
      const alunoAtualizado = await this.service.updateAluno(id, alunoEditadoBody);
      return CommonResponse.success(
        res,
        alunoAtualizado,
        HttpStatusCode.OK.code,
        "Aluno atualizado com sucesso",
      );
    } catch (error) {
      return this.handleError(res, error, "updateAluno");
    }
  };

  private handleError(res: Response, error: unknown, context: string) {
    if (error instanceof ZodError) {
      console.warn(
        `[AlunoController] [${context}] Erro de validação Zod:`,
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
        `[AlunoController] [${context}] DatabaseError:`,
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
        `[AlunoController] [${context}] Recurso não encontrado:`,
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

    console.error(`[AlunoController] [${context}] Erro interno:`, errorMessage);
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

export default AlunoController;
