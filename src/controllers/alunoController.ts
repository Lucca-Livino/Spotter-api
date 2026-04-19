import { Request, Response } from "express";
import AlunosService from "../services/alunoService";
import UploadService from "../services/uploadService";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import { ZodError } from "zod";
import { DatabaseError } from "../utils/errors/DatabaseError";
import { type_aluno } from "../types/dbSchemas";

class AlunoController {
  private service: AlunosService;
  private uploadService: UploadService;

  constructor() {
    this.service = new AlunosService();
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
      console.error('[AlunoController] Erro ao deletar foto órfã:', error);
    }
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
    let fotoUrl: string | null = null;
    try {
      console.log("[AlunosController] [createAluno] Requisição recebida");
      const body = await this.parseMultipartData(req);

      fotoUrl = await this.uploadFoto(req);

      const novoAluno: type_aluno = {
        user_id: body.user_id,
        nome: body.nome,
        data_nascimento: body.data_nascimento,
        sexo: body.sexo,
        url_foto: fotoUrl || body.url_foto || null,
        status_conta: body.status_conta ?? true,
        academia_id: body.academia_id,
        treinador_id: body.treinador_id ?? null,
      };

      if (!novoAluno.nome || !novoAluno.user_id) {
        if (fotoUrl) await this.deleteFoto(fotoUrl);
        return CommonResponse.error(
          res,
          HttpStatusCode.BAD_REQUEST.code,
          null,
          "",
          [],
          "Dados do aluno são obrigatórios (user_id, nome)",
        );
      }

      const resposta = await this.service.createAluno(novoAluno);
      return CommonResponse.created(
        res,
        resposta,
        HttpStatusCode.CREATED.message,
      );
    } catch (error) {
      if (fotoUrl) await this.deleteFoto(fotoUrl);
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
    let fotoUrl: string | null = null;
    try {
      console.log("[AlunoController] [updateAluno] Requisição recebida");
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
      const alunoEditadoBody: Record<string, unknown> = { ...body };
      const fotoResolvida = fotoUrl || body.url_foto;
      if (fotoResolvida !== undefined) {
        alunoEditadoBody.url_foto = fotoResolvida;
      }

      const alunoAtualizado = await this.service.updateAluno(id, alunoEditadoBody);
      return CommonResponse.success(
        res,
        alunoAtualizado,
        HttpStatusCode.OK.code,
        "Aluno atualizado com sucesso",
      );
    } catch (error) {
      if (fotoUrl) await this.deleteFoto(fotoUrl);
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

    if (errorMessage.toLowerCase().includes("corpo da requisição é obrigatório")) {
      return CommonResponse.error(res, HttpStatusCode.BAD_REQUEST.code, null, null, [], errorMessage);
    }

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
