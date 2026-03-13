import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { loginSchema, registerSchema, requestPasswordResetSchema, resetPasswordSchema, changePasswordSchema } from "../utils/validations/authValidation";

export const authRegistry = new OpenAPIRegistry();

const UserResponse = z.object({
    id: z.string().openapi({ example: "user_abc123" }),
    name: z.string().openapi({ example: "John Doe" }),
    email: z.string().email().openapi({ example: "user@example.com" }),
    image: z.string().nullable().openapi({ example: "https://example.com/avatar.png" }),
}).openapi("User");

const SessionResponse = z.object({
    session: z.object({
        id: z.string().openapi({ example: "session_abc123" }),
        userId: z.string().openapi({ example: "user_abc123" }),
        token: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIs..." }),
        expiresAt: z.string().openapi({ example: "2025-12-31T23:59:59.000Z" }),
    }),
    user: UserResponse,
}).openapi("SessionResponse");

// POST /auth/sign-in/email
authRegistry.registerPath({
    method: "post",
    path: "/auth/sign-in/email",
    summary: "Login com email/senha",
    description: "Realiza autenticação via email e senha. Retorna sessão e token.",
    tags: ["Auth"],
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: loginSchema },
            },
        },
    },
    responses: {
        200: {
            description: "Login realizado com sucesso",
            content: {
                "application/json": { schema: SessionResponse },
            },
        },
        401: { description: "Credenciais inválidas" },
        422: { description: "Erro de validação" },
    },
});

// POST /auth/sign-up/email
authRegistry.registerPath({
    method: "post",
    path: "/auth/sign-up/email",
    summary: "Cadastro com email/senha",
    description: "Registra um novo usuário com email e senha.",
    tags: ["Auth"],
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: registerSchema },
            },
        },
    },
    responses: {
        200: {
            description: "Usuário registrado com sucesso",
            content: {
                "application/json": { schema: SessionResponse },
            },
        },
        422: { description: "Erro de validação" },
    },
});

// POST /auth/sign-out
authRegistry.registerPath({
    method: "post",
    path: "/auth/sign-out",
    summary: "Logout",
    description: "Invalida a sessão atual do usuário.",
    tags: ["Auth"],
    security: [{ BearerAuth: [] }],
    responses: {
        200: { description: "Logout realizado com sucesso" },
    },
});

// GET /auth/get-session
authRegistry.registerPath({
    method: "get",
    path: "/auth/get-session",
    summary: "Obter sessão atual",
    description: "Retorna os dados da sessão atual do usuário autenticado.",
    tags: ["Auth"],
    security: [{ BearerAuth: [] }],
    responses: {
        200: {
            description: "Sessão ativa",
            content: {
                "application/json": { schema: SessionResponse },
            },
        },
        401: { description: "Sessão inválida ou expirada" },
    },
});

// GET /me
authRegistry.registerPath({
    method: "get",
    path: "/me",
    summary: "Dados do usuário autenticado",
    description: "Retorna os dados básicos do usuário autenticado.",
    tags: ["Auth"],
    security: [{ BearerAuth: [] }],
    responses: {
        200: {
            description: "Dados do usuário",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: UserResponse,
                    }),
                },
            },
        },
        401: { description: "Não autorizado" },
    },
});

// POST /auth/forget-password
authRegistry.registerPath({
    method: "post",
    path: "/auth/forget-password",
    summary: "Solicitar redefinição de senha",
    description: "Envia um email com link para redefinição de senha.",
    tags: ["Auth"],
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: requestPasswordResetSchema },
            },
        },
    },
    responses: {
        200: { description: "Email de redefinição enviado (se o email existir)" },
        422: { description: "Erro de validação" },
    },
});

// POST /auth/reset-password
authRegistry.registerPath({
    method: "post",
    path: "/auth/reset-password",
    summary: "Redefinir senha",
    description: "Redefine a senha usando o token recebido por email.",
    tags: ["Auth"],
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: resetPasswordSchema },
            },
        },
    },
    responses: {
        200: { description: "Senha redefinida com sucesso" },
        400: { description: "Token inválido ou expirado" },
        422: { description: "Erro de validação" },
    },
});

// POST /auth/change-password
authRegistry.registerPath({
    method: "post",
    path: "/auth/change-password",
    summary: "Alterar senha",
    description: "Altera a senha do usuário autenticado.",
    tags: ["Auth"],
    security: [{ BearerAuth: [] }],
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: changePasswordSchema },
            },
        },
    },
    responses: {
        200: { description: "Senha alterada com sucesso" },
        401: { description: "Não autorizado" },
        422: { description: "Erro de validação" },
    },
});
