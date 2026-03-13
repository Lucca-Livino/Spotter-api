import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const emailSchema = z
  .string()
  .trim()
  .email("Informe um email valido")
  .openapi({
    description: "Email do usuario",
    example: "user@example.com",
  });

const passwordSchema = z
  .string()
  .min(8, "A senha deve ter no minimo 8 caracteres")
  .max(128, "A senha deve ter no maximo 128 caracteres")
  .openapi({
    description: "Senha do usuario",
    example: "password1234",
  });

const callbackUrlSchema = z
  .string()
  .url("callbackURL deve ser uma URL valida")
  .optional()
  .openapi({
    description: "URL de redirecionamento apos autenticacao",
    example: "http://localhost:3000/dashboard",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional().default(true).openapi({
    description: "Mantem a sessao ativa entre reinicios do app",
    example: true,
  }),
  callbackURL: callbackUrlSchema,
}).strict().openapi("LoginInput");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "O nome deve ter ao menos 2 caracteres").max(100, "O nome deve ter no maximo 100 caracteres").openapi({
    description: "Nome do usuario",
    example: "John Doe",
  }),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(8, "Confirme a senha").openapi({
    description: "Confirmacao da senha informada",
    example: "password1234",
  }),
  image: z.string().url("A imagem deve ser uma URL valida").optional().openapi({
    description: "URL da foto de perfil do usuario",
    example: "https://example.com/avatar.png",
  }),
  callbackURL: callbackUrlSchema,
})
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas nao coincidem",
  })
  .openapi("RegisterInput");

export const betterAuthRegisterPayloadSchema = registerSchema.transform(
  ({ confirmPassword, ...data }) => data,
);

export const requestPasswordResetSchema = z
  .object({
    email: emailSchema,
    redirectTo: z
      .string()
      .url("redirectTo deve ser uma URL valida")
      .optional()
      .openapi({
        description: "URL para onde o usuario sera enviado ao redefinir a senha",
        example: "http://localhost:3000/reset-password",
      }),
  })
  .strict()
  .openapi("RequestPasswordResetInput");

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "O token de redefinicao e obrigatorio").openapi({
      description: "Token recebido no fluxo de redefinicao de senha",
      example: "reset-token-123",
    }),
    newPassword: passwordSchema.openapi({
      description: "Nova senha do usuario",
      example: "newPassword1234",
    }),
    confirmPassword: z.string().min(8, "Confirme a nova senha").openapi({
      description: "Confirmacao da nova senha",
      example: "newPassword1234",
    }),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas nao coincidem",
  })
  .openapi("ResetPasswordInput");

export const betterAuthResetPasswordPayloadSchema = resetPasswordSchema.transform(
  ({ confirmPassword, ...data }) => data,
);

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema.openapi({
      description: "Senha atual do usuario",
      example: "password1234",
    }),
    newPassword: passwordSchema.openapi({
      description: "Nova senha do usuario",
      example: "newPassword1234",
    }),
    confirmPassword: z.string().min(8, "Confirme a nova senha").openapi({
      description: "Confirmacao da nova senha",
      example: "newPassword1234",
    }),
    revokeOtherSessions: z.boolean().optional().default(false).openapi({
      description: "Revoga as outras sessoes do usuario apos a troca de senha",
      example: true,
    }),
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "A nova senha deve ser diferente da senha atual",
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas nao coincidem",
  })
  .openapi("ChangePasswordInput");

export const betterAuthChangePasswordPayloadSchema = changePasswordSchema.transform(
  ({ confirmPassword, ...data }) => data,
);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type BetterAuthRegisterPayload = z.infer<
  typeof betterAuthRegisterPayloadSchema
>;