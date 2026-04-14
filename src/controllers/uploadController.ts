import { Request, Response } from "express";
import { ZodError } from "zod";
import UploadService from "../services/uploadService";
import CommonResponse from "../utils/helpers/commonResponse";
import HttpStatusCode from "../utils/helpers/httpStatusCode";
import {
  deleteUploadParamsSchema,
  uploadParamsSchema,
  uploadedFileSchema,
} from "../utils/validations/uploadValidation";

class UploadController {
  private service: UploadService;

  constructor() {
    this.service = new UploadService();
  }

  uploadArquivos = async (req: Request, res: Response) => {
    try {
      const { category } = uploadParamsSchema.parse(req.params);
      const files = (req.files as Express.Multer.File[]) || [];

      if (!files.length) {
        return CommonResponse.error(
          res,
          HttpStatusCode.BAD_REQUEST.code,
          null,
          "files",
          [],
          "Nenhum arquivo enviado. Use o campo multipart 'files'.",
        );
      }

      const validatedFiles = files.map((file) => uploadedFileSchema.parse(file));
      const uploaded = await this.service.uploadFiles(category, validatedFiles);

      return CommonResponse.success(
        res,
        {
          total: uploaded.length,
          arquivos: uploaded,
        },
        HttpStatusCode.OK.code,
        `${uploaded.length} arquivo(s) enviado(s) com sucesso.`,
      );
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

      const message = error instanceof Error ? error.message : "Erro desconhecido";
      return CommonResponse.serverError(
        res,
        { message },
        HttpStatusCode.INTERNAL_SERVER_ERROR.message,
      );
    }
  };

  deleteArquivo = async (req: Request, res: Response) => {
    try {
      const { category, fileName } = deleteUploadParamsSchema.parse(req.params);
      const deleted = await this.service.deleteFile(category, fileName);

      return CommonResponse.success(
        res,
        deleted,
        HttpStatusCode.OK.code,
        "Arquivo deletado com sucesso.",
      );
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

      const message = error instanceof Error ? error.message : "Erro desconhecido";
      if (message.includes("nao encontrado")) {
        return CommonResponse.error(
          res,
          HttpStatusCode.NOT_FOUND.code,
          null,
          null,
          [],
          message,
        );
      }

      return CommonResponse.serverError(
        res,
        { message },
        HttpStatusCode.INTERNAL_SERVER_ERROR.message,
      );
    }
  };
}

export default UploadController;
