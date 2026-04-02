import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const maxFileSizeMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || "20");
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
];

const uploadParamsSchema = z.object({
  category: z
    .enum(["alunos", "treinadores", "geral"], {
      message: "Categoria invalida. Use: alunos, treinadores ou geral",
    })
    .openapi({ description: "Categoria para organizar os arquivos no bucket", example: "alunos" }),
});

const deleteUploadParamsSchema = uploadParamsSchema.extend({
  fileName: z
    .string()
    .min(1, { message: "fileName e obrigatorio" })
    .max(255, { message: "fileName muito longo" })
    .regex(/^[a-zA-Z0-9._-]+$/, {
      message: "fileName contem caracteres invalidos",
    })
    .openapi({
      description: "Nome do arquivo (somente o nome, sem pasta)",
      example: "1713020123456-550e8400-e29b-41d4-a716-446655440000.jpg",
    }),
});

const uploadedFileSchema = z
  .object({
    originalname: z.string().min(1),
    mimetype: z.string().min(1),
    size: z.number().positive(),
    buffer: z.instanceof(Buffer),
  })
  .superRefine((file, ctx) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Tipo de arquivo nao suportado: ${file.mimetype}`,
        path: ["mimetype"],
      });
    }

    if (file.size > maxFileSizeBytes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Arquivo excede o tamanho maximo de ${maxFileSizeMb}MB`,
        path: ["size"],
      });
    }
  })
  .openapi("UploadedFile");

export {
  uploadParamsSchema,
  deleteUploadParamsSchema,
  uploadedFileSchema,
  allowedMimeTypes,
  maxFileSizeMb,
};
