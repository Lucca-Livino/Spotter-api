import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

export const uploadRegistry = new OpenAPIRegistry();

const uploadParams = z.object({
  category: z.enum(["alunos", "treinadores", "geral"]).openapi({
    description: "Categoria para organizar os objetos no bucket",
    example: "alunos",
  }),
});

const deleteUploadParams = uploadParams.extend({
  fileName: z.string().openapi({
    description: "Nome do arquivo salvo (sem o prefixo da categoria)",
    example: "1713020123456-550e8400-e29b-41d4-a716-446655440000.jpg",
  }),
});

const UploadedFileResponse = z.object({
  bucket: z.string().openapi({ example: "fabrica4-midias" }),
  objectKey: z.string().openapi({ example: "alunos/1713020123456-uuid.jpg" }),
  originalName: z.string().openapi({ example: "foto.jpg" }),
  mimetype: z.string().openapi({ example: "image/jpeg" }),
  size: z.number().openapi({ example: 102400 }),
  url: z.string().openapi({ example: "https://cdn.exemplo.com/alunos/1713020123456-uuid.jpg" }),
}).openapi("UploadedFileResponse");

uploadRegistry.registerPath({
  method: "post",
  path: "/upload/{category}",
  summary: "Upload de arquivos para S3 (GarageHQ)",
  description:
    "Recebe multipart/form-data com o campo `files` e envia os arquivos para o bucket configurado no GarageHQ S3.",
  tags: ["Upload"],
  security: [{ BearerAuth: [] }],
  request: {
    params: uploadParams,
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            files: z
              .any()
              .openapi({ description: "Um ou mais arquivos no campo files" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Upload realizado com sucesso",
      content: {
        "application/json": {
          schema: z.object({
            error: z.boolean().openapi({ example: false }),
            code: z.number().openapi({ example: 200 }),
            message: z.string().nullable().openapi({ example: "1 arquivo(s) enviado(s) com sucesso." }),
            data: z.object({
              total: z.number().openapi({ example: 1 }),
              arquivos: z.array(UploadedFileResponse),
            }),
            errors: z.array(z.any()),
          }),
        },
      },
    },
    400: { description: "Nenhum arquivo enviado" },
    401: { description: "Nao autorizado" },
    422: { description: "Validacao falhou" },
    500: { description: "Erro interno no upload" },
  },
});

uploadRegistry.registerPath({
  method: "delete",
  path: "/upload/{category}/{fileName}",
  summary: "Excluir arquivo do S3 (GarageHQ)",
  description: "Remove um arquivo do bucket informado pela categoria e nome do arquivo.",
  tags: ["Upload"],
  security: [{ BearerAuth: [] }],
  request: {
    params: deleteUploadParams,
  },
  responses: {
    200: {
      description: "Arquivo removido com sucesso",
      content: {
        "application/json": {
          schema: z.object({
            error: z.boolean().openapi({ example: false }),
            code: z.number().openapi({ example: 200 }),
            message: z.string().nullable().openapi({ example: "Arquivo deletado com sucesso." }),
            data: z.object({
              bucket: z.string().openapi({ example: "spotter" }),
              objectKey: z.string().openapi({ example: "alunos/1713020123456-550e8400-e29b-41d4-a716-446655440000.jpg" }),
            }),
            errors: z.array(z.any()),
          }),
        },
      },
    },
    401: { description: "Nao autorizado" },
    404: { description: "Arquivo nao encontrado" },
    422: { description: "Validacao falhou" },
    500: { description: "Erro interno ao remover arquivo" },
  },
});
